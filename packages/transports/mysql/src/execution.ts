import type { GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { getNamedType, isObjectType } from 'graphql';
import graphqlFields from 'graphql-fields';
import { createPool, type Pool, type PoolConnection } from 'mysql';
import { introspection, upgrade } from 'mysql-utilities';
import { util } from '@graphql-mesh/cross-helpers';
import type { DisposableExecutor } from '@graphql-mesh/transport-common';
import { getDefDirectives, makeAsyncDisposable } from '@graphql-mesh/utils';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { getDirective, MapperKind, mapSchema, type ExecutionRequest } from '@graphql-tools/utils';
import { getConnectionOptsFromEndpointUri } from './parseEndpointUri.js';
import type { MySQLContext } from './types.js';

function getFieldsFromResolveInfo(info: GraphQLResolveInfo) {
  const fieldMap: Record<string, any> = graphqlFields(info);
  return Object.keys(fieldMap).filter(
    fieldName => Object.keys(fieldMap[fieldName]).length === 0 && fieldName !== '__typename',
  );
}

export interface GetMySQLExecutorOpts {
  subgraph: GraphQLSchema;
  pool?: Pool;
}

export function getMySQLExecutor({ subgraph, pool }: GetMySQLExecutorOpts): DisposableExecutor {
  const mysqlConnectionByContext = new WeakMap<any, PoolConnection>();
  subgraph = mapSchema(subgraph, {
    [MapperKind.OBJECT_FIELD](fieldConfig, fieldName) {
      const directives = getDefDirectives(subgraph, fieldConfig);
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
                      const foreignDirectiveArgs = foreignDirective?.[0];
                      const columnName = foreignDirectiveArgs?.columnName;
                      if (columnName) {
                        fields.push(columnName);
                      }
                    } else {
                      throw new Error(`Invalid type for field ${fieldName}`);
                    }
                  }
                }
              }
              const mysqlConnection = mysqlConnectionByContext.get(context);
              if (limit.length) {
                const selectLimit$ = util.promisify(
                  mysqlConnection.selectLimit.bind(mysqlConnection),
                );
                return selectLimit$(table, fields, limit, where, args?.orderBy);
              } else {
                const select$ = util.promisify(mysqlConnection.select.bind(mysqlConnection));
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
              const mysqlConnection = mysqlConnectionByContext.get(context);
              const count$ = util.promisify(mysqlConnection.count.bind(mysqlConnection));
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
              const mysqlConnection = mysqlConnectionByContext.get(context);
              const select$ = util.promisify(mysqlConnection.select.bind(mysqlConnection));
              const insert$ = util.promisify(mysqlConnection.insert.bind(mysqlConnection));
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
              const mysqlConnection = mysqlConnectionByContext.get(context);
              const update$ = util.promisify(mysqlConnection.update.bind(mysqlConnection));
              await update$(table, args[table], args.where);
              const fields = getFieldsFromResolveInfo(info);
              const select$ = util.promisify(mysqlConnection.select.bind(mysqlConnection));
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
              const mysqlConnection = mysqlConnectionByContext.get(context);
              const delete$ = util.promisify(mysqlConnection.delete.bind(mysqlConnection));
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
  const isDebug =
    globalThis.process?.env?.DEBUG?.includes('mysql') ||
    globalThis.process?.env?.DEBUG?.toString() === '1' ||
    globalThis.process?.env?.DEBUG?.toLowerCase() === 'true';
  pool ||= createPool({
    ...connectionOpts,
    supportBigNumbers: true,
    bigNumberStrings: true,
    debug: !!isDebug,
    trace: !!isDebug,
  });
  pool.on('connection', connection => {
    introspection(connection);
    upgrade(connection);
  });

  const defaultExecutor = createDefaultExecutor(subgraph);
  const getConnection$ = util.promisify(pool.getConnection.bind(pool));

  return makeAsyncDisposable(
    async function mysqlExecutor(executionRequest: ExecutionRequest) {
      const mysqlConnection = await getConnection$();
      mysqlConnectionByContext.set(executionRequest.context, mysqlConnection);
      try {
        return await defaultExecutor(executionRequest);
      } finally {
        mysqlConnectionByContext.delete(executionRequest.context);
        mysqlConnection.release();
      }
    },
    () =>
      new Promise<void>((resolve, reject) => {
        pool.end(err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
  );
}
