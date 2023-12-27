import { getNamedType, GraphQLResolveInfo, GraphQLSchema, isObjectType } from 'graphql';
import graphqlFields from 'graphql-fields';
import { createPool, type Pool } from 'mysql';
import { upgrade } from 'mysql-utilities';
import { util } from '@graphql-mesh/cross-helpers';
import { MeshPubSub } from '@graphql-mesh/types';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { Executor, getDirective, getDirectives, MapperKind, mapSchema } from '@graphql-tools/utils';
import { getConnectionOptsFromEndpointUri } from './parseEndpointUri';
import { MySQLContext } from './types';

function getFieldsFromResolveInfo(info: GraphQLResolveInfo) {
  const fieldMap: Record<string, any> = graphqlFields(info);
  return Object.keys(fieldMap).filter(
    fieldName => Object.keys(fieldMap[fieldName]).length === 0 && fieldName !== '__typename',
  );
}

export interface GetMySQLExecutorOpts {
  subgraph: GraphQLSchema;
  pool?: Pool;
  pubsub?: MeshPubSub;
}

export function getMySQLExecutor({ subgraph, pool, pubsub }: GetMySQLExecutorOpts): Executor {
  subgraph = mapSchema(subgraph, {
    [MapperKind.OBJECT_FIELD](fieldConfig, fieldName) {
      const directives = getDirectives(subgraph, fieldConfig);
      for (const directive of directives) {
        switch (directive.name) {
          case 'mysqlSelect': {
            const { table, columnMap: columnMapEntries } = directive.args;
            const columnMap = new Map<string, string>(columnMapEntries);
            fieldConfig.resolve = function mysqlSelectResolver(
              root,
              args,
              context: MySQLContext,
              info,
            ) {
              const where = {
                ...args.where,
              };
              columnMap.forEach((foreignColumn, localColumn) => {
                where[foreignColumn] = root[localColumn];
              });
              const limit: number[] = [args.limit, args.offset].filter(Boolean);
              const fieldMap: Record<string, any> = graphqlFields(info);
              const fields: string[] = [];
              for (const fieldName in fieldMap) {
                if (fieldName !== '__typename') {
                  const subFieldMap = fieldMap[fieldName];
                  if (Object.keys(subFieldMap).length === 0) {
                    fields.push(fieldName);
                  } else {
                    const returnType = getNamedType(fieldConfig.type);
                    if (isObjectType(returnType)) {
                      const returnTypeFields = returnType.getFields();
                      const foreignField = returnTypeFields[fieldName];
                      const foreignDirective = getDirective(
                        subgraph,
                        foreignField,
                        'mysqlTableForeign',
                      );
                      if (!foreignDirective?.length) {
                        throw new Error(
                          `Missing mysqlTableForeign directive for field ${fieldName}`,
                        );
                      }
                      const foreignDirectiveArgs = foreignDirective[0];
                      fields.push(foreignDirectiveArgs.columnName);
                    } else {
                      throw new Error(`Invalid type for field ${fieldName}`);
                    }
                  }
                }
              }
              if (limit.length) {
                const selectLimit$ = util.promisify(
                  context.mysqlConnection.selectLimit.bind(context.mysqlConnection),
                );
                return selectLimit$(table, fields, limit, where, args?.orderBy);
              } else {
                const select$ = util.promisify(
                  context.mysqlConnection.select.bind(context.mysqlConnection),
                );
                return select$(table, fields, where, args?.orderBy);
              }
            };
            break;
          }
          case 'mysqlCount': {
            const { table } = directive.args;
            fieldConfig.resolve = function mysqlCountResolver(
              root,
              args,
              context: MySQLContext,
              info,
            ) {
              const count$ = util.promisify(
                context.mysqlConnection.count.bind(context.mysqlConnection),
              );
              return count$(table, args.where);
            };
            break;
          }
          case 'mysqlInsert': {
            const { table, primaryKeys } = directive.args;
            fieldConfig.resolve = async function mysqlInsertResolver(
              root,
              args,
              context: MySQLContext,
              info,
            ) {
              const select$ = util.promisify(
                context.mysqlConnection.select.bind(context.mysqlConnection),
              );
              const insert$ = util.promisify(
                context.mysqlConnection.insert.bind(context.mysqlConnection),
              );
              const input = args[table];
              const { recordId } = await insert$(table, input);
              const fields = getFieldsFromResolveInfo(info);
              const where: Record<string, any> = {};
              for (const primaryColumnName of primaryKeys) {
                where[primaryColumnName] = input[primaryColumnName] || recordId;
              }
              const result = await select$(table, fields, where, {});
              return result[0];
            };
            break;
          }
          case 'mysqlUpdate': {
            const { table } = directive.args;
            fieldConfig.resolve = async function mysqlUpdateResolver(
              root,
              args,
              context: MySQLContext,
              info,
            ) {
              const update$ = util.promisify(
                context.mysqlConnection.update.bind(context.mysqlConnection),
              );
              await update$(table, args[table], args.where);
              const fields = getFieldsFromResolveInfo(info);
              const select$ = util.promisify(
                context.mysqlConnection.select.bind(context.mysqlConnection),
              );
              const result = await select$(table, fields, args.where, {});
              return result[0];
            };
            break;
          }
          case 'mysqlDelete': {
            const { table } = directive.args;
            fieldConfig.resolve = async function mysqlDeleteResolver(
              root,
              args,
              context: MySQLContext,
              info,
            ) {
              const delete$ = util.promisify(
                context.mysqlConnection.delete.bind(context.mysqlConnection),
              );
              const res = await delete$(table, args.where);
              return !!res.affectedRows;
            };
            break;
          }
        }
      }
      return fieldConfig;
    },
  });

  const transportDirectives = getDirective(subgraph, subgraph, 'transport');
  if (!transportDirectives?.length) {
    throw new Error(`No transport directives found in the schema`);
  }
  const transportDirective = transportDirectives[0];
  const { location } = transportDirective;
  const connectionOpts = getConnectionOptsFromEndpointUri(location);
  pool ||= createPool({
    ...connectionOpts,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
  pool.on('connection', connection => {
    upgrade(connection);
  });

  const defaultExecutor = createDefaultExecutor(subgraph);
  const getConnection$ = util.promisify(pool.getConnection.bind(pool));
  if (pubsub) {
    const id = pubsub.subscribe('destroy', () => {
      pool.end(err => {
        if (err) {
          console.error(err);
        }
        pubsub.unsubscribe(id);
      });
    });
  } else {
    console.warn(
      `FIXME: No pubsub provided for mysql executor, so the connection pool will never be closed`,
    );
  }
  return async function mysqlExecutor(executionRequest) {
    const mysqlConnection = await getConnection$();
    const mysqlContext = {
      mysqlConnection,
      ...executionRequest.context,
    };
    try {
      return await defaultExecutor({
        ...executionRequest,
        context: mysqlContext,
      });
    } finally {
      mysqlConnection.release();
    }
  };
}
