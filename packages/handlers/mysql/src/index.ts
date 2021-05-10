import { GetMeshSourceOptions, MeshPubSub, MeshHandler, MeshSource, YamlConfig } from '@graphql-mesh/types';
import { SchemaComposer, EnumTypeComposerValueConfigDefinition } from 'graphql-compose';
import { TableForeign, createPool, Pool } from 'mysql';
import { upgrade, introspection } from 'mysql-utilities';
import { promisify } from 'util';
import { pascalCase } from 'pascal-case';
import graphqlFields from 'graphql-fields';
import { camelCase } from 'camel-case';
import {
  GraphQLBigInt,
  GraphQLDateTime,
  GraphQLJSON,
  GraphQLDate,
  GraphQLTimestamp,
  GraphQLTime,
  GraphQLUnsignedInt,
  GraphQLUnsignedFloat,
} from 'graphql-scalars';
import { specifiedDirectives } from 'graphql';
import { loadFromModuleExportExpression, jitExecutorFactory } from '@graphql-mesh/utils';
import { ExecutionParams } from '@graphql-tools/delegate';

const SCALARS = {
  bigint: 'BigInt',
  'bigint unsigned': 'BigInt',
  binary: 'String',
  bit: 'Int',
  blob: 'String',
  bool: 'Boolean',
  boolean: 'Boolean',

  char: 'String',

  date: 'Date',
  datetime: 'DateTime',

  dec: 'Float',
  'dec unsigned': 'UnsignedFloat',
  decimal: 'Float',
  'decimal unsigned': 'UnsignedFloat',
  double: 'Float',
  'double unsigned': 'UnsignedFloat',

  float: 'Float',
  'float unsigned': 'UnsignedFloat',

  int: 'Int',
  'int unsigned': 'UnsignedInt',
  integer: 'Int',
  'integer unsigned': 'UnsignedInt',

  json: 'JSON',

  longblob: 'String',
  longtext: 'String',

  mediumblob: 'String',
  mediumint: 'Int',
  'mediumint unsigned': 'UnsignedInt',
  mediumtext: 'String',

  numeric: 'Float',
  'numeric unsigned': 'UnsignedFloat',

  smallint: 'Int',
  'smallint unsigned': 'UnsignedInt',

  text: 'String',
  time: 'Time',
  timestamp: 'Timestamp',
  tinyblob: 'String',
  tinyint: 'Int',
  'tinyint unsigned': 'UnsignedInt',
  tinytext: 'String',

  varbinary: 'String',
  varchar: 'String',

  year: 'Int',
};

type MySQLIntrospectionCache = {
  [Key in keyof MysqlPromisifiedConnection]?: MysqlPromisifiedConnection[Key] extends (...args: any[]) => any
    ? ThenArg<ReturnType<MysqlPromisifiedConnection[Key]>>
    : never;
};

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
type MysqlPromisifiedConnection = ThenArg<ReturnType<typeof MySQLHandler.prototype.getPromisifiedConnection>>;

type MysqlContext = { mysqlConnection: MysqlPromisifiedConnection };

export default class MySQLHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.MySQLHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private introspectionCache: MySQLIntrospectionCache;

  constructor({
    name,
    config,
    baseDir,
    pubsub,
    introspectionCache = {},
  }: GetMeshSourceOptions<YamlConfig.MySQLHandler, MySQLIntrospectionCache>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.introspectionCache = introspectionCache;
  }

  async getPromisifiedConnection(pool: Pool) {
    const getConnection = promisify(pool.getConnection.bind(pool));

    const connection = await getConnection();

    const getDatabaseTables = promisify(connection.databaseTables.bind(connection));
    const getTableFields = promisify(connection.fields.bind(connection));
    const getTableForeigns = promisify(connection.foreign.bind(connection));
    const getTablePrimaryKeyMetadata = promisify(connection.primary.bind(connection));

    const selectLimit = promisify(connection.selectLimit.bind(connection));
    const select = promisify(connection.select.bind(connection));
    const insert = promisify(connection.insert.bind(connection));
    const update = promisify(connection.update.bind(connection));
    const deleteRow = promisify(connection.delete.bind(connection));
    const count = promisify(connection.count.bind(connection));

    return {
      connection,
      getDatabaseTables,
      getTableFields,
      getTableForeigns,
      getTablePrimaryKeyMetadata,
      selectLimit,
      select,
      insert,
      update,
      deleteRow,
      count,
    };
  }

  private getCachedIntrospectionConnection(pool: Pool) {
    let promisiedConnection$: Promise<MysqlPromisifiedConnection>;
    return new Proxy<MysqlPromisifiedConnection>({} as any, {
      get: (_, methodName) => {
        if (methodName === 'connection') {
          return {
            release: () => promisiedConnection$?.then(promisiedConnection => promisiedConnection?.connection.release()),
          };
        }
        return (...args: any[]) => {
          const cacheKey = [methodName, ...args].join('_');
          if (cacheKey in this.introspectionCache) {
            return this.introspectionCache[cacheKey];
          } else {
            promisiedConnection$ = promisiedConnection$ || this.getPromisifiedConnection(pool);
            return promisiedConnection$
              .then(promisiedConnection => promisiedConnection[methodName](...args))
              .then(result => {
                this.introspectionCache[cacheKey] = result;
                return result;
              });
          }
        };
      },
    });
  }

  async getMeshSource(): Promise<MeshSource> {
    const { pool: configPool } = this.config;
    const schemaComposer = new SchemaComposer<MysqlContext>();
    const pool: Pool = configPool
      ? typeof configPool === 'string'
        ? await loadFromModuleExportExpression(configPool, { cwd: this.baseDir })
        : configPool
      : createPool(this.config);

    pool.on('connection', connection => {
      upgrade(connection);
      introspection(connection);
    });

    const introspectionConnection = this.getCachedIntrospectionConnection(pool);

    schemaComposer.add(GraphQLBigInt);
    schemaComposer.add(GraphQLJSON);
    schemaComposer.add(GraphQLDate);
    schemaComposer.add(GraphQLTime);
    schemaComposer.add(GraphQLDateTime);
    schemaComposer.add(GraphQLTimestamp);
    schemaComposer.add(GraphQLUnsignedInt);
    schemaComposer.add(GraphQLUnsignedFloat);
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
    const tables = await introspectionConnection.getDatabaseTables(pool.config.connectionConfig.database);
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
        const primaryKeyMetadata = await introspectionConnection.getTablePrimaryKeyMetadata(tableName);
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
            if (!type) {
              console.warn(`${realTypeName} couldn't be mapped to a type. It will be mapped to JSON as a fallback.`);
              type = 'JSON';
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
            const columnName = tableForeign.COLUMN_NAME;
            const foreignTableName = tableForeign.REFERENCED_TABLE_NAME;
            const foreignColumnName = tableForeign.REFERENCED_COLUMN_NAME;
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
                    [foreignColumnName]: root[columnName],
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
        schemaComposer.Query.addFields({
          [camelCase(`count_${tableName}`)]: {
            type: 'Int',
            args: {
              where: {
                type: whereInputName,
              },
            },
            resolve: async (root, args, { mysqlConnection }, info) => {
              return mysqlConnection.count(tableName, args.where);
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
              const input = args[tableName];
              const { recordId } = await mysqlConnection.insert(tableName, input);
              const fieldMap: Record<string, any> = graphqlFields(info);
              const fields = Object.keys(fieldMap).filter(fieldName => Object.keys(fieldMap[fieldName]).length === 0);
              const where: any = {};
              const primaryColumnName = primaryKeyMetadata.Column_name;
              where[primaryColumnName] = input[primaryColumnName] || recordId;
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
              await mysqlConnection.update(tableName, args[tableName], args.where);
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
    this.pubsub.subscribe('destroy', () => pool.end());

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const schema = schemaComposer.buildSchema();

    introspectionConnection.connection.release();

    const jitExecutor = jitExecutorFactory(schema, this.name);
    const executor: any = async ({ document, variables, context: meshContext, info }: ExecutionParams) => {
      const mysqlConnection = await this.getPromisifiedConnection(pool);
      const contextValue = { ...meshContext, mysqlConnection };
      return jitExecutor({ document, variables, context: contextValue, info });
    };

    return {
      schema,
      executor,
    };
  }
}
