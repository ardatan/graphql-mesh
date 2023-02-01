import { GraphQLResolveInfo, specifiedDirectives } from 'graphql';
import { EnumTypeComposerValueConfigDefinition, SchemaComposer } from 'graphql-compose';
import graphqlFields from 'graphql-fields';
import {
  GraphQLBigInt,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLJSON,
  GraphQLTime,
  GraphQLTimestamp,
  GraphQLUnsignedFloat,
  GraphQLUnsignedInt,
} from 'graphql-scalars';
import { process } from '@graphql-mesh/cross-helpers';
import { MeshStore, PredefinedProxyOptions } from '@graphql-mesh/store';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import {
  ImportFn,
  MeshHandler,
  MeshHandlerOptions,
  MeshPubSub,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { ExecutionRequest } from '@graphql-tools/utils';
import { Client, Config } from '@planetscale/database';

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

interface TableForeign {
  CONSTRAINT_NAME: string;
  COLUMN_NAME: string;
  ORDINAL_POSITION: number;
  POSITION_IN_UNIQUE_CONSTRAINT: number;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
type PScalePromisifiedConnection = ThenArg<ReturnType<typeof getPromisifiedConnection>>;

type PScaleContext = { pscaleConnection: PScalePromisifiedConnection };

async function getPromisifiedConnection(pool: Config) {
  const client = new Client(pool);

  const connection = client.connection();

  const getDatabaseTables = async () => (await connection.execute('SHOW TABLES')).rows;
  const getTableFields = async (tableName: string) =>
    (await connection.execute(`DESCRIBE ${tableName}`)).rows;
  const getTableForeigns = async (tableName: string) =>
    (await connection.execute(`SHOW CREATE TABLE ${tableName}`)).rows[0]['Create Table'].match(
      /CONSTRAINT `(.*)` FOREIGN KEY \(`(.*)`\) REFERENCES `(.*)` \(`(.*)`\)/g,
    );
  const getTablePrimaryKeyMetadata = async (tableName: string) =>
    (await connection.execute(`SHOW INDEX FROM ${tableName} WHERE Key_name = 'PRIMARY'`)).rows[0];

  const selectLimit = async (
    tableName: string,
    fields: string[],
    where: any,
    limit: number[],
    orderBy?: 'asc' | 'desc',
  ) => {
    const [offset, limitCount] = limit;
    const order = orderBy ? `ORDER BY ${orderBy}` : '';
    const rows = (
      await connection.execute(
        `SELECT ${fields.join(', ')} FROM ${tableName} WHERE ? ${order} LIMIT ?, ?`,
        [where, offset, limitCount],
      )
    ).rows;
    return rows;
  };
  const select = async (
    tableName: string,
    fields: string[],
    where: any,
    orderBy?: 'asc' | 'desc',
  ) => {
    const order = orderBy ? `ORDER BY ${orderBy}` : '';
    const rows = (
      await connection.execute(
        `SELECT ${fields.join(', ')} FROM ${tableName} WHERE ? ${order}`,
        where,
      )
    ).rows;
    return rows;
  };
  const insert = async (tableName: string, data: any) =>
    (await connection.execute(`INSERT INTO ${tableName} SET ?`, data)).rows[0];
  const update = async (tableName: string, data: any, where: any) =>
    (await connection.execute(`UPDATE ${tableName} SET ? WHERE ?`, [data, where])).rows;
  const deleteRow = async (tableName: string, where: any) =>
    (await connection.execute(`DELETE FROM ${tableName} WHERE ?`, where)).rows;
  const count = async (tableName: string, where: any) =>
    (await connection.execute(`SELECT COUNT(*) FROM ${tableName} WHERE ?`, where)).rows[0][
      'COUNT(*)'
    ];
  // const release = () => connection.execute('RELEASE');

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

function getFieldsFromResolveInfo(info: GraphQLResolveInfo) {
  const fieldMap: Record<string, any> = graphqlFields(info);
  return Object.keys(fieldMap).filter(
    fieldName => Object.keys(fieldMap[fieldName]).length === 0 && fieldName !== '__typename',
  );
}

export default class PlanetScaleHandler implements MeshHandler {
  private config: YamlConfig.PlanetScaleHandler;
  private baseDir: string;
  private pubsub: MeshPubSub;
  private store: MeshStore;
  private importFn: ImportFn;

  constructor({
    name,
    config,
    baseDir,
    pubsub,
    store,
    importFn,
    logger,
  }: MeshHandlerOptions<YamlConfig.PlanetScaleHandler>) {
    this.config = config;
    this.baseDir = baseDir;
    this.pubsub = pubsub;
    this.store = store;
    this.importFn = importFn;
  }

  private getCachedIntrospectionConnection(pool: Config) {
    let promisifiedConnection$: Promise<PScalePromisifiedConnection>;
    return new Proxy<PScalePromisifiedConnection>({} as any, {
      get: (_, methodName) => {
        return async (...args: any[]) => {
          const cacheKey = [methodName, ...args].join('_');
          const cacheProxy = this.store.proxy(
            cacheKey,
            PredefinedProxyOptions.JsonWithoutValidation,
          );
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
    const schemaComposer = new SchemaComposer<PScaleContext>();
    const pool: Config = {
      host: this.config.host && stringInterpolator.parse(this.config.host, { env: process.env }),
      port:
        this.config.port &&
        parseInt(stringInterpolator.parse(this.config.port.toString(), { env: process.env })),
      user: this.config.user && stringInterpolator.parse(this.config.user, { env: process.env }),
      password:
        this.config.password &&
        stringInterpolator.parse(this.config.password, { env: process.env }),
      database:
        this.config.database &&
        stringInterpolator.parse(this.config.database, { env: process.env }),
      ...this.config,
    };

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
    const tables = await introspectionConnection.getDatabaseTables();
    const tableNames: string[] = this.config.tables || (Object.keys(tables) as string[]);
    const typeMergingOptions: MeshSource['merge'] = {};
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
          description: table.TABLE_COMMENT || undefined,
          extensions: table,
          fields: {},
        });
        const tableInsertIC = schemaComposer.createInputTC({
          name: insertInputName,
          description: table.TABLE_COMMENT || undefined,
          extensions: table,
          fields: {},
        });
        const tableUpdateIC = schemaComposer.createInputTC({
          name: updateInputName,
          description: table.TABLE_COMMENT || undefined,
          extensions: table,
          fields: {},
        });
        const tableWhereIC = schemaComposer.createInputTC({
          name: whereInputName,
          description: table.TABLE_COMMENT || undefined,
          extensions: table,
          fields: {},
        });
        const tableOrderByIC = schemaComposer.createInputTC({
          name: orderByInputName,
          description: table.TABLE_COMMENT || undefined,
          extensions: table,
          fields: {},
        });
        const primaryKeys = new Set<string>();
        const fields = await introspectionConnection.getTableFields(tableName);
        const fieldNames =
          this.config.tableFields?.find(({ table }) => table === tableName)?.fields ||
          (Object.keys(fields) as string[]);
        await Promise.all(
          fieldNames.map(async fieldName => {
            const tableField = fields[fieldName];
            if (tableField.Key === 'PRI') {
              primaryKeys.add(fieldName);
            }
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
              console.warn(
                `${realTypeName} couldn't be mapped to a type. It will be mapped to JSON as a fallback.`,
              );
              type = 'JSON';
            }
            if (tableField.Null.toLowerCase() === 'no') {
              type += '!';
            }
            tableTC.addFields({
              [fieldName]: {
                type,
                description: tableField.Comment || undefined,
              },
            });
            tableInsertIC.addFields({
              [fieldName]: {
                type,
                description: tableField.Comment || undefined,
              },
            });
            tableUpdateIC.addFields({
              [fieldName]: {
                type: type.replace('!', ''),
                description: tableField.Comment || undefined,
              },
            });
            tableWhereIC.addFields({
              [fieldName]: {
                type: 'String',
                description: tableField.Comment || undefined,
              },
            });
            tableOrderByIC.addFields({
              [fieldName]: {
                type: 'OrderBy',
                description: tableField.Comment || undefined,
              },
            });
          }),
        );
        const tableForeigns = await introspectionConnection.getTableForeigns(tableName);
        const tableForeignNames = Object.keys(tableForeigns);
        await Promise.all(
          tableForeignNames.map(async foreignName => {
            const tableForeign = tableForeigns[foreignName];
            const columnName = tableForeign.COLUMN_NAME;
            if (!fieldNames.includes(columnName)) {
              return;
            }
            const foreignTableName = tableForeign.REFERENCED_TABLE_NAME;
            const foreignColumnName = tableForeign.REFERENCED_COLUMN_NAME;

            const foreignObjectTypeName = sanitizeNameForGraphQL(foreignTableName);
            const foreignWhereInputName = sanitizeNameForGraphQL(foreignTableName + '_WhereInput');
            const foreignOrderByInputName = sanitizeNameForGraphQL(
              foreignTableName + '_OrderByInput',
            );
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
                resolve: async (root, args, { pscaleConnection }, info) => {
                  const where = {
                    [foreignColumnName]: root[columnName],
                    ...args?.where,
                  };
                  // Generate limit statement
                  const limit: number[] = [args.limit, args.offset].filter(Boolean);
                  const fields = getFieldsFromResolveInfo(info);
                  if (limit.length) {
                    return pscaleConnection.selectLimit(
                      foreignTableName,
                      fields,
                      where,
                      limit,
                      args?.orderBy,
                    );
                  } else {
                    return pscaleConnection.select(foreignTableName, fields, where, args?.orderBy);
                  }
                },
              },
            });
            const foreignOTC = schemaComposer.getOTC(foreignObjectTypeName);
            foreignOTC.addFields({
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
                extensions: {
                  COLUMN_NAME: foreignColumnName,
                },
                resolve: (root, args, { pscaleConnection }: PScaleContext, info) => {
                  const where = {
                    [columnName]: root[foreignColumnName],
                    ...args?.where,
                  };
                  const fieldMap: Record<string, any> = graphqlFields(info);
                  const fields: string[] = [];
                  for (const fieldName in fieldMap) {
                    if (fieldName !== '__typename') {
                      const subFieldMap = fieldMap[fieldName];
                      if (Object.keys(subFieldMap).length === 0) {
                        fields.push(fieldName);
                      } else {
                        const tableForeign = schemaComposer
                          .getOTC(objectTypeName)
                          .getField(fieldName).extensions as TableForeign;
                        fields.push(tableForeign.COLUMN_NAME);
                      }
                    }
                  }
                  // Generate limit statement
                  const limit = [args.limit, args.offset].filter(Boolean);
                  if (limit.length) {
                    return pscaleConnection.selectLimit(
                      tableName,
                      fields,
                      limit,
                      where,
                      args?.orderBy,
                    );
                  } else {
                    return pscaleConnection.select(tableName, fields, where, args?.orderBy);
                  }
                },
              },
            });
          }),
        );
        typeMergingOptions[objectTypeName] = {
          selectionSet: `{ ${[...primaryKeys].join(' ')} }`,
          args: obj => {
            const where = {};
            for (const primaryKey of primaryKeys) {
              where[primaryKey] = obj[primaryKey];
            }
            return {
              where,
            };
          },
          valuesFromResults: results => results[0],
        };
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
            resolve: (root, args, { pscaleConnection }: PScaleContext, info) => {
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
                return pscaleConnection.selectLimit(
                  tableName,
                  fields,
                  limit,
                  args.where,
                  args?.orderBy,
                );
              } else {
                return pscaleConnection.select(tableName, fields, args.where, args?.orderBy);
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
            resolve: (root, args, { pscaleConnection }: PScaleContext, info) =>
              pscaleConnection.count(tableName, args.where),
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
            resolve: async (root, args, { pscaleConnection }: PScaleContext, info) => {
              const input = args[tableName];
              const { recordId } = (await pscaleConnection.insert(tableName, input)) as Record<
                string,
                any
              >;
              const fields = getFieldsFromResolveInfo(info);
              const where: Record<string, any> = {};
              for (const primaryColumnName of primaryKeys) {
                where[primaryColumnName] = input[primaryColumnName] || recordId;
              }
              const result = await pscaleConnection.select(tableName, fields, where);
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
            resolve: async (root, args, { pscaleConnection }: PScaleContext, info) => {
              await pscaleConnection.update(tableName, args[tableName], args.where);
              const fields = getFieldsFromResolveInfo(info);
              const result = await pscaleConnection.select(tableName, fields, args.where);
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
            resolve: (root, args, { pscaleConnection }: PScaleContext) =>
              pscaleConnection.deleteRow(tableName, args.where).then(result => !!result),
          },
        });
      }),
    );

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const schema = schemaComposer.buildSchema();

    const executor = createDefaultExecutor(schema);

    return {
      schema,
      async executor(executionRequest: ExecutionRequest) {
        const pscaleConnection = await getPromisifiedConnection(pool);
        try {
          return await executor({
            ...executionRequest,
            context: {
              ...executionRequest.context,
              pscaleConnection,
            },
          });
        } catch (e: any) {
          return e;
        }
      },
    };
  }
}
