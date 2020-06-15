import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { SchemaComposer, EnumTypeComposerValueConfigDefinition } from 'graphql-compose';
import { TableForeign, createPool, Pool } from 'mysql';
import { upgrade, introspection } from 'mysql-utilities';
import { promisify } from 'util';
import { pascalCase } from 'pascal-case';
import graphqlFields from 'graphql-fields';
import { camelCase } from 'camel-case';
import { GraphQLBigInt, GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { execute } from 'graphql';

const SCALARS = {
  bigint: 'BigInt',
  binary: 'String',
  bit: 'Int',
  blob: 'String',
  bool: 'Boolean',
  boolean: 'Boolean',

  char: 'String',

  date: 'DateTime',
  datetime: 'DateTime',

  dec: 'Float',
  decimal: 'Float',
  double: 'Float',

  float: 'Float',

  int: 'Int',
  integer: 'Int',

  json: 'JSON',

  longblob: 'String',
  longtext: 'String',

  mediumblob: 'String',
  mediumint: 'Int',
  mediumtext: 'String',

  numeric: 'Float',

  smallint: 'Int',

  text: 'String',
  time: 'Date',
  timestamp: 'Date',
  tinyblob: 'String',
  tinyint: 'Int',
  tinytext: 'String',

  varbinary: 'String',
  varchar: 'String',

  year: 'Int',
};

async function getPromisifiedConnection(pool: Pool) {
  const getConnection = promisify(pool.getConnection.bind(pool));

  const connection = await getConnection();

  const getDatabaseTables = promisify(connection.databaseTables.bind(connection));
  const getTableFields = promisify(connection.fields.bind(connection));
  const getTableForeigns = promisify(connection.foreign.bind(connection));
  const getTablePrimaryKeys = promisify(connection.primary.bind(connection));

  const selectLimit = promisify(connection.selectLimit.bind(connection));
  const select = promisify(connection.select.bind(connection));
  const insert = promisify(connection.insert.bind(connection));
  const update = promisify(connection.update.bind(connection));
  const deleteRow = promisify(connection.delete.bind(connection));

  return {
    connection,
    getDatabaseTables,
    getTableFields,
    getTableForeigns,
    getTablePrimaryKeys,
    selectLimit,
    select,
    insert,
    update,
    deleteRow,
  };
}

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
type MysqlPromisifiedConnection = ThenArg<ReturnType<typeof getPromisifiedConnection>>;

type MysqlContext = { mysqlConnection: MysqlPromisifiedConnection };

const handler: MeshHandlerLibrary<YamlConfig.MySQLHandler> = {
  async getMeshSource({ config, hooks }) {
    const schemaComposer = new SchemaComposer<MysqlContext>();
    const pool = createPool(config);
    pool.on('connection', connection => {
      upgrade(connection);
      introspection(connection);
    });

    const introspectionConnection = await getPromisifiedConnection(pool);

    schemaComposer.add(GraphQLBigInt);
    schemaComposer.add(GraphQLJSON);
    schemaComposer.add(GraphQLDateTime);
    schemaComposer.createEnumTC({
      name: 'OrderBy',
      values: {
        asc: {
          value: 'asc',
        },
        desc: {
          value: 'desc',
        },
      },
    });
    const tables = await introspectionConnection.getDatabaseTables(config.database);
    await Promise.all(
      Object.keys(tables).map(async tableName => {
        const table = tables[tableName];
        const objectTypeName = pascalCase(table.TABLE_NAME);
        const insertInputName = pascalCase(table.TABLE_NAME + '_InsertInput');
        const updateInputName = pascalCase(table.TABLE_NAME + '_UpdateInput');
        const whereInputName = pascalCase(table.TABLE_NAME + '_WhereInput');
        const orderByInputName = pascalCase(table.TABLE_NAME + '_OrderByInput');
        const tableTC = schemaComposer.createObjectTC({
          name: objectTypeName,
          description: table.TABLE_COMMENT,
          extensions: table,
          fields: {},
        });
        const tableInsertIC = schemaComposer.createInputTC({
          name: insertInputName,
          description: table.TABLE_COMMENT,
          extensions: table,
          fields: {},
        });
        const tableUpdateIC = schemaComposer.createInputTC({
          name: updateInputName,
          description: table.TABLE_COMMENT,
          extensions: table,
          fields: {},
        });
        const tableWhereIC = schemaComposer.createInputTC({
          name: whereInputName,
          description: table.TABLE_COMMENT,
          extensions: table,
          fields: {},
        });
        const tableOrderByIC = schemaComposer.createInputTC({
          name: orderByInputName,
          description: table.TABLE_COMMENT,
          extensions: table,
          fields: {},
        });
        const primaryKeys = await introspectionConnection.getTablePrimaryKeys(tableName);
        const fields = await introspectionConnection.getTableFields(tableName);
        await Promise.all(
          Object.keys(fields).map(async fieldName => {
            const tableField = fields[fieldName];
            const typePattern = tableField.Type;
            const [realTypeNameCased, restTypePattern] = typePattern.split('(');
            const [typeDetails] = restTypePattern?.split(')') || [];
            const realTypeName = realTypeNameCased.toLowerCase();
            let type: string = SCALARS[realTypeName];
            if (realTypeName === 'enum' || realTypeName === 'set') {
              const enumValues = typeDetails.split(`'`).join('').split(',');
              const enumTypeName = pascalCase(tableName + '_' + fieldName);
              schemaComposer.createEnumTC({
                name: enumTypeName,
                values: enumValues.reduce((prev, curr) => {
                  let enumKey = pascalCase(curr).toUpperCase();
                  if (!isNaN(parseInt(enumKey[0]))) {
                    enumKey = '_' + enumKey;
                  }
                  return {
                    ...prev,
                    [enumKey]: {
                      value: curr,
                    },
                  };
                }, {} as EnumTypeComposerValueConfigDefinition),
              });
              type = enumTypeName;
            }
            if (tableField.Null.toLowerCase() === 'no') {
              type += '!';
            }
            tableTC.addFields({
              [fieldName]: {
                type,
                description: tableField.Comment,
              },
            });
            tableInsertIC.addFields({
              [fieldName]: {
                type,
                description: tableField.Comment,
              },
            });
            tableUpdateIC.addFields({
              [fieldName]: {
                type: type.replace('!', ''),
                description: tableField.Comment,
              },
            });
            tableWhereIC.addFields({
              [fieldName]: {
                type: 'String',
                description: tableField.Comment,
              },
            });
            tableOrderByIC.addFields({
              [fieldName]: {
                type: 'OrderBy',
                description: tableField.Comment,
              },
            });
          })
        );
        const tableForeigns = await introspectionConnection.getTableForeigns(tableName);
        await Promise.all(
          Object.keys(tableForeigns).map(async foreignName => {
            const tableForeign = tableForeigns[foreignName];
            const foreignTableName = tableForeign.REFERENCED_TABLE_NAME;
            const foreignColumnName = tableForeign.COLUMN_NAME;
            const foreignTypeName = pascalCase(foreignTableName);
            tableTC.addFields({
              [foreignTableName]: {
                type: '[' + foreignTypeName + ']',
                args: {
                  where: {
                    type: foreignTypeName + 'WhereInput',
                  },
                  orderBy: {
                    type: foreignTypeName + 'OrderByInput',
                  },
                  limit: {
                    type: 'Int',
                  },
                  offset: {
                    type: 'Int',
                  },
                },
                extensions: tableForeign,
                resolve: async (root, args, { mysqlConnection }, info) => {
                  const fieldMap: Record<string, any> = graphqlFields(info);
                  const fields = Object.keys(fieldMap).filter(
                    fieldName => Object.keys(fieldMap[fieldName]).length === 0
                  );
                  const where = {
                    [foreignColumnName]: root[foreignColumnName],
                    ...args?.where,
                  };
                  // Generate limit statement
                  const limit: number[] = [args.limit, args.offset].filter(Boolean);
                  if (limit.length) {
                    return mysqlConnection.selectLimit(foreignTableName, fields, limit, where, args?.orderBy);
                  } else {
                    return mysqlConnection.select(foreignTableName, fields, where, args?.orderBy);
                  }
                },
              },
            });
          })
        );
        schemaComposer.Query.addFields({
          [camelCase(`get_${tableName}`)]: {
            type: '[' + objectTypeName + ']',
            args: {
              limit: {
                type: 'Int',
              },
              offset: {
                type: 'Int',
              },
              where: {
                type: whereInputName,
              },
              orderBy: {
                type: orderByInputName,
              },
            },
            resolve: async (root, args, { mysqlConnection }, info) => {
              const fieldMap: Record<string, any> = graphqlFields(info);
              const fields: string[] = [];
              await Promise.all(
                Object.keys(fieldMap).map(async fieldName => {
                  const subFieldMap = fieldMap[fieldName];
                  if (Object.keys(subFieldMap).length === 0) {
                    fields.push(fieldName);
                  } else {
                    const tableForeign = schemaComposer.getOTC(objectTypeName).getField(fieldName)
                      .extensions as TableForeign;
                    fields.push(tableForeign.COLUMN_NAME);
                  }
                })
              );
              // Generate limit statement
              const limit = [args.limit, args.offset].filter(Boolean);
              if (limit.length) {
                return mysqlConnection.selectLimit(tableName, fields, limit, args.where, args?.orderBy);
              } else {
                return mysqlConnection.select(tableName, fields, args.where, args?.orderBy);
              }
            },
          },
        });
        schemaComposer.Mutation.addFields({
          [camelCase(`insert_${tableName}`)]: {
            type: objectTypeName,
            args: {
              [tableName]: {
                type: insertInputName + '!',
              },
            },
            resolve: async (root, args, { mysqlConnection }, info) => {
              const { recordId } = await mysqlConnection.insert(args);
              const fieldMap: Record<string, any> = graphqlFields(info);
              const fields = Object.keys(fieldMap).filter(fieldName => Object.keys(fieldMap[fieldName]).length === 0);
              const where: any = {};
              await Promise.all(
                Object.keys(primaryKeys).map(async primaryKeyName => {
                  const primaryKey = primaryKeys[primaryKeyName];
                  const columnName = primaryKey.Column_name;
                  where[columnName] = args[columnName] || recordId;
                })
              );
              const result = await mysqlConnection.select(tableName, fields, where, {});
              return result[0];
            },
          },
          [camelCase(`update_${tableName}`)]: {
            type: objectTypeName,
            args: {
              [tableName]: {
                type: updateInputName + '!',
              },
              where: {
                type: whereInputName,
              },
            },
            resolve: async (root, args, { mysqlConnection }, info) => {
              await mysqlConnection.update(
                tableName,
                {
                  [tableName]: args[tableName],
                },
                args.where
              );
              const fieldMap: Record<string, any> = graphqlFields(info);
              const fields = Object.keys(fieldMap).filter(fieldName => Object.keys(fieldMap[fieldName]).length === 0);
              const result = await mysqlConnection.select(tableName, fields, args.where, {});
              return result[0];
            },
          },
          [camelCase(`delete_${tableName}`)]: {
            type: 'Boolean',
            args: {
              where: {
                type: whereInputName,
              },
            },
            resolve: async (root, args, { mysqlConnection }) => {
              await mysqlConnection.deleteRow(tableName, args.where);
              return true;
            },
          },
        });
      })
    );
    hooks.on('destroy', () => pool.end());

    const schema = schemaComposer.buildSchema();

    introspectionConnection.connection.release();

    return {
      schema,
      async executor({ document, variables, context: meshContext }) {
        const mysqlConnection = await getPromisifiedConnection(pool);
        const result = (await execute({
          schema,
          document,
          variableValues: variables,
          contextValue: { ...meshContext, mysqlConnection },
        })) as any;
        mysqlConnection.connection.release();
        return result;
      },
    };
  },
};

export default handler;
