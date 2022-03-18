import {
  GetMeshSourceOptions,
  MeshPubSub,
  MeshHandler,
  MeshSource,
  YamlConfig,
  ImportFn,
  Logger,
} from '@graphql-mesh/types';
import { SchemaComposer, EnumTypeComposerValueConfigDefinition } from 'graphql-compose';
import { TableForeign, createPool, Pool } from 'mysql';
import { upgrade, introspection } from 'mysql-utilities';
import { promisify } from 'util';
import graphqlFields from 'graphql-fields';
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
import {
  jitExecutorFactory,
  loadFromModuleExportExpression,
  sanitizeNameForGraphQL,
  stringInterpolator,
} from '@graphql-mesh/utils';
import { MeshStore, PredefinedProxyOptions } from '@graphql-mesh/store';
import { ExecutionRequest } from '@graphql-tools/utils';

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

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
type MysqlPromisifiedConnection = ThenArg<ReturnType<typeof getPromisifiedConnection>>;

type MysqlContext = { mysqlConnection: MysqlPromisifiedConnection };

async function getPromisifiedConnection(pool: Pool) {
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
  const release = connection.release.bind(connection);

  return {
    connection,
    release,
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

export default class MySQLHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.MySQLHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private store: MeshStore;
  private importFn: ImportFn;
  private logger: Logger;

  constructor({
    name,
    config,
    baseDir,
    pubsub,
    store,
    importFn,
    logger,
  }: GetMeshSourceOptions<YamlConfig.MySQLHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.store = store;
    this.importFn = importFn;
    this.logger = logger;
  }

  private getCachedIntrospectionConnection(pool: Pool) {
    let promisifiedConnection$: Promise<MysqlPromisifiedConnection>;
    return new Proxy<MysqlPromisifiedConnection>({} as any, {
      get: (_, methodName) => {
        if (methodName === 'release') {
          return () =>
            promisifiedConnection$?.then(promisifiedConnection => promisifiedConnection?.connection.release());
        }
        return async (...args: any[]) => {
          const cacheKey = [methodName, ...args].join('_');
          const cacheProxy = this.store.proxy(cacheKey, PredefinedProxyOptions.JsonWithoutValidation);
          return cacheProxy.getWithSet(async () => {
            promisifiedConnection$ = promisifiedConnection$ || getPromisifiedConnection(pool);
            const promisifiedConnection = await promisifiedConnection$;
            return promisifiedConnection[methodName](...args);
          });
        };
      },
    });
  }

  async getMeshSource(): Promise<MeshSource> {
    const { pool: configPool } = this.config;
    const schemaComposer = new SchemaComposer<MysqlContext>();
    const pool: Pool = configPool
      ? typeof configPool === 'string'
        ? await loadFromModuleExportExpression(configPool, {
            cwd: this.baseDir,
            defaultExportName: 'default',
            importFn: this.importFn,
          })
        : configPool
      : createPool({
          supportBigNumbers: true,
          bigNumberStrings: true,
          dateStrings: true,
          trace: !!process.env.DEBUG,
          debug: !!process.env.DEBUG,
          host: this.config.host && stringInterpolator.parse(this.config.host, { env: process.env }),
          port:
            this.config.port && parseInt(stringInterpolator.parse(this.config.port.toString(), { env: process.env })),
          user: this.config.user && stringInterpolator.parse(this.config.user, { env: process.env }),
          password: this.config.password && stringInterpolator.parse(this.config.password, { env: process.env }),
          database: this.config.database && stringInterpolator.parse(this.config.database, { env: process.env }),
          ...this.config,
        });

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
    const tableNames = this.config.tables || Object.keys(tables);
    await Promise.all(
      tableNames.map(async tableName => {
        if (this.config.tables && !this.config.tables.includes(tableName)) {
          return;
        }
        const table = tables[tableName];
        const objectTypeName = sanitizeNameForGraphQL(table.TABLE_NAME);
        const insertInputName = sanitizeNameForGraphQL(table.TABLE_NAME + '_InsertInput');
        const updateInputName = sanitizeNameForGraphQL(table.TABLE_NAME + '_UpdateInput');
        const whereInputName = sanitizeNameForGraphQL(table.TABLE_NAME + '_WhereInput');
        const orderByInputName = sanitizeNameForGraphQL(table.TABLE_NAME + '_OrderByInput');
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
        const fieldNames =
          this.config.tableFields?.find(({ table }) => table === tableName)?.fields || Object.keys(fields);
        await Promise.all(
          fieldNames.map(async fieldName => {
            const tableField = fields[fieldName];
            const typePattern = tableField.Type;
            const [realTypeNameCased, restTypePattern] = typePattern.split('(');
            const [typeDetails] = restTypePattern?.split(')') || [];
            const realTypeName = realTypeNameCased.toLowerCase();
            let type: string = SCALARS[realTypeName];
            if (realTypeName === 'enum' || realTypeName === 'set') {
              const enumValues = typeDetails.split(`'`).join('').split(',');
              const enumTypeName = sanitizeNameForGraphQL(tableName + '_' + fieldName);
              schemaComposer.createEnumTC({
                name: enumTypeName,
                values: enumValues.reduce((prev, curr) => {
                  const enumKey = sanitizeNameForGraphQL(curr);
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
            if (!fieldNames.includes(columnName)) {
              return;
            }
            const foreignTableName = tableForeign.REFERENCED_TABLE_NAME;
            const foreignColumnName = tableForeign.REFERENCED_COLUMN_NAME;

            const foreignObjectTypeName = sanitizeNameForGraphQL(foreignTableName);
            const foreignWhereInputName = sanitizeNameForGraphQL(foreignTableName + '_WhereInput');
            const foreignOrderByInputName = sanitizeNameForGraphQL(foreignTableName + '_OrderByInput');
            tableTC.addFields({
              [foreignTableName]: {
                type: '[' + foreignObjectTypeName + ']',
                args: {
                  where: {
                    type: foreignWhereInputName,
                  },
                  orderBy: {
                    type: foreignOrderByInputName,
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
                    fieldName => Object.keys(fieldMap[fieldName]).length === 0 && fieldName !== '__typename'
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
          [tableName]: {
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
            resolve: (root, args, { mysqlConnection }, info) => {
              const fieldMap: Record<string, any> = graphqlFields(info);
              const fields: string[] = [];
              for (const fieldName in fieldMap) {
                if (fieldName !== '__typename') {
                  const subFieldMap = fieldMap[fieldName];
                  if (Object.keys(subFieldMap).length === 0) {
                    fields.push(fieldName);
                  } else {
                    const tableForeign = schemaComposer.getOTC(objectTypeName).getField(fieldName)
                      .extensions as TableForeign;
                    fields.push(tableForeign.COLUMN_NAME);
                  }
                }
              }
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
          [`count_${tableName}`]: {
            type: 'Int',
            args: {
              where: {
                type: whereInputName,
              },
            },
            resolve: (root, args, { mysqlConnection }, info) => mysqlConnection.count(tableName, args.where),
          },
        });
        schemaComposer.Mutation.addFields({
          [`insert_${tableName}`]: {
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
              const fields = Object.keys(fieldMap).filter(
                fieldName => Object.keys(fieldMap[fieldName]).length === 0 && fieldName !== '__typename'
              );
              const where: any = {};
              const primaryColumnName = primaryKeyMetadata.Column_name;
              where[primaryColumnName] = input[primaryColumnName] || recordId;
              const result = await mysqlConnection.select(tableName, fields, where, {});
              return result[0];
            },
          },
          [`update_${tableName}`]: {
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
              const fields = Object.keys(fieldMap).filter(
                fieldName => Object.keys(fieldMap[fieldName]).length === 0 && fieldName !== '__typename'
              );
              const result = await mysqlConnection.select(tableName, fields, args.where, {});
              return result[0];
            },
          },
          [`delete_${tableName}`]: {
            type: 'Boolean',
            args: {
              where: {
                type: whereInputName,
              },
            },
            resolve: (root, args, { mysqlConnection }) =>
              mysqlConnection.deleteRow(tableName, args.where).then(result => !!result?.affectedRows),
          },
        });
      })
    );
    introspectionConnection.release();

    this.pubsub
      .subscribe('destroy', () => pool.end())
      .catch(e => this.logger.error(`Couldn't release pool: ${e.stack || e.message || e}`));

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const schema = schemaComposer.buildSchema();

    const jitExecutor = jitExecutorFactory(schema, this.name, this.logger);

    return {
      schema,
      async executor(executionRequest: ExecutionRequest) {
        const mysqlConnection = await getPromisifiedConnection(pool);
        try {
          return await jitExecutor({
            ...executionRequest,
            context: {
              ...executionRequest.context,
              mysqlConnection,
            },
          });
        } catch (e: any) {
          return e;
        } finally {
          mysqlConnection.release();
        }
      },
    };
  }
}
