import type {
  EnumTypeComposerValueConfigDefinition,
  InputTypeComposer,
  ObjectTypeComposer,
} from 'graphql-compose';
import { SchemaComposer } from 'graphql-compose';
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
import type { Connection, DatabaseTable, MysqlError, TableField, TableForeign } from 'mysql';
import { createConnection } from 'mysql';
import { introspection, upgrade } from 'mysql-utilities';
import { fs, process, util } from '@graphql-mesh/cross-helpers';
import type { MySQLSSLOptions } from '@graphql-mesh/transport-mysql';
import { getConnectionOptsFromEndpointUri } from '@graphql-mesh/transport-mysql';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import {
  MySQLCountDirective,
  MySQLDeleteDirective,
  MySQLInsertDirective,
  MySQLSelectDirective,
  MySQLTableForeignDirective,
  MySQLUpdateDirective,
  TransportDirective,
} from './directives.js';
import type { TableFieldConfig } from './types.js';

export interface LoadGraphQLSchemaFromMySQLOpts {
  endpoint: string;
  ssl?: MySQLSSLOptions;
  tables?: string[];
}

export async function loadGraphQLSchemaFromMySQL(
  subgraphName: string,
  opts: LoadGraphQLSchemaFromMySQLOpts,
) {
  const connectionOpts = getConnectionOptsFromEndpointUri(opts.endpoint);
  let sslOpts: MySQLSSLOptions | undefined;
  if (connectionOpts.protocol === 'mysqls:') {
    sslOpts = {
      rejectUnauthorized:
        opts.ssl?.rejectUnauthorized || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '1',
      ca: opts.ssl?.caPath ? fs.readFileSync(opts.ssl?.caPath) : opts.ssl?.ca,
    };
  }
  connectionOpts.ssl = sslOpts;

  const introspectionConnection = createConnection(connectionOpts);

  upgrade(introspectionConnection);
  introspection(introspectionConnection);
  const getDatabaseTables = util.promisify(
    introspectionConnection.databaseTables.bind(introspectionConnection),
  );
  const schemaComposer = new SchemaComposer();
  schemaComposer.add(GraphQLBigInt);
  schemaComposer.add(GraphQLJSON);
  schemaComposer.add(GraphQLDate);
  schemaComposer.add(GraphQLTime);
  schemaComposer.add(GraphQLDateTime);
  schemaComposer.add(GraphQLTimestamp);
  schemaComposer.add(GraphQLUnsignedInt);
  schemaComposer.add(GraphQLUnsignedFloat);
  schemaComposer.addDirective(TransportDirective);
  schemaComposer.addDirective(MySQLSelectDirective);
  schemaComposer.addDirective(MySQLInsertDirective);
  schemaComposer.addDirective(MySQLUpdateDirective);
  schemaComposer.addDirective(MySQLDeleteDirective);
  schemaComposer.addDirective(MySQLTableForeignDirective);
  schemaComposer.addDirective(MySQLCountDirective);
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

  const tables = await getDatabaseTables(connectionOpts.database);
  const tableNames = opts.tables || Object.keys(tables);
  const autoIncrementedColumns = await getAutoIncrementFields(introspectionConnection);
  await Promise.all(
    tableNames.map(async tableName => {
      await handleTableName({
        subgraphName,
        tableName,
        tables,
        schemaComposer,
        introspectionConnection,
        autoIncrementedColumns,
      });
    }),
  );
  const endConnection$ = util.promisify<
    // we need to define the generic because introspectionConnection.end is overloaded
    (err?: MysqlError) => void
  >(introspectionConnection.end.bind(introspectionConnection));
  await endConnection$(undefined);

  const schema = schemaComposer.buildSchema();
  const extensions: any = (schema.extensions ||= {});
  extensions.directives ||= {};
  extensions.directives.transport = {
    subgraph: subgraphName,
    kind: 'mysql',
    location: opts.endpoint,
  };
  return schema;
}

const SCALARS: Record<string, string> = {
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

function getAutoIncrementFields(connection: Connection): Promise<Record<string, string>> {
  const queryKeyValue$ = util.promisify(connection.queryKeyValue.bind(connection));
  return queryKeyValue$(
    'SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE EXTRA LIKE "%auto_increment%"',
    [],
  );
}

async function handleTableName({
  subgraphName,
  tableName,
  tables,
  schemaComposer,
  introspectionConnection,
  autoIncrementedColumns,
  tableFieldsConfig,
  filteredTables,
}: {
  subgraphName: string;
  tableName: string;
  tables: Record<string, DatabaseTable>;
  schemaComposer: SchemaComposer;
  introspectionConnection: Connection;
  autoIncrementedColumns: Record<string, string>;
  tableFieldsConfig?: TableFieldConfig[];
  filteredTables?: string[];
}) {
  if (filteredTables && !filteredTables.includes(tableName)) {
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
  const getTableFields$ = util.promisify(
    introspectionConnection.fields.bind(introspectionConnection),
  );
  const fields = await getTableFields$(tableName);
  const fieldNames =
    tableFieldsConfig?.find(({ table }) => table === tableName)?.fields || Object.keys(fields);
  await Promise.all(
    fieldNames.map(fieldName =>
      handleFieldName({
        fields,
        primaryKeys,
        schemaComposer,
        tableName,
        fieldName,
        autoIncrementedColumns,
        tableTC,
        tableInsertIC,
        tableUpdateIC,
        tableWhereIC,
        tableOrderByIC,
      }),
    ),
  );
  const getTableForeigns$ = util.promisify(
    introspectionConnection.foreign.bind(introspectionConnection),
  );
  const tableForeigns = await getTableForeigns$(tableName);
  const tableForeignNames = Object.keys(tableForeigns);
  await Promise.all(
    tableForeignNames.map(foreignName =>
      handleTableForeignName({
        subgraphName,
        foreignName,
        tableForeigns,
        schemaComposer,
        tableTC,
        fieldNames,
        tableName,
        whereInputName,
        orderByInputName,
        objectTypeName,
      }),
    ),
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
      directives: [
        {
          name: 'mysqlSelect',
          args: {
            subgraph: subgraphName,
            table: tableName,
          },
        },
      ],
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
      directives: [
        {
          name: 'mysqlCount',
          args: {
            subgraph: subgraphName,
            table: tableName,
          },
        },
      ],
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
      directives: [
        {
          name: 'mysqlInsert',
          args: {
            subgraph: subgraphName,
            table: tableName,
            primaryKeys: Array.from(primaryKeys),
          },
        },
      ],
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
      directives: [
        {
          name: 'mysqlUpdate',
          args: {
            subgraph: subgraphName,
            table: tableName,
          },
        },
      ],
    },
    [`delete_${tableName}`]: {
      type: 'Boolean',
      args: {
        where: {
          type: whereInputName,
        },
      },
      directives: [
        {
          name: 'mysqlDelete',
          args: {
            subgraph: subgraphName,
            table: tableName,
          },
        },
      ],
    },
  });
}

async function handleFieldName({
  fields,
  primaryKeys,
  schemaComposer,
  tableName,
  fieldName,
  autoIncrementedColumns,
  tableTC,
  tableInsertIC,
  tableUpdateIC,
  tableWhereIC,
  tableOrderByIC,
}: {
  fields: Record<string, TableField>;
  primaryKeys: Set<string>;
  schemaComposer: SchemaComposer;
  tableName: string;
  fieldName: string;
  autoIncrementedColumns: Record<string, string>;
  tableTC: ObjectTypeComposer<any, any>;
  tableInsertIC: InputTypeComposer<any>;
  tableUpdateIC: InputTypeComposer<any>;
  tableWhereIC: InputTypeComposer<any>;
  tableOrderByIC: InputTypeComposer<any>;
}) {
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
  const isNullable = tableField.Null.toLowerCase() === 'yes';
  const isRequired =
    !isNullable && tableField.Default === null && autoIncrementedColumns[tableName] !== fieldName;
  tableTC.addFields({
    [fieldName]: {
      type: isNullable ? type : type + '!',
      description: tableField.Comment || undefined,
    },
  });
  tableInsertIC.addFields({
    [fieldName]: {
      type: isRequired ? type + '!' : type,
      description: tableField.Comment || undefined,
    },
  });
  tableUpdateIC.addFields({
    [fieldName]: {
      type,
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
}

async function handleTableForeignName({
  subgraphName,
  foreignName,
  tableForeigns,
  schemaComposer,
  tableTC,
  fieldNames,
  tableName,
  whereInputName,
  orderByInputName,
  objectTypeName,
}: {
  subgraphName: string;
  foreignName: string;
  tableForeigns: Record<string, TableForeign>;
  schemaComposer: SchemaComposer;
  tableTC: ObjectTypeComposer<any, any>;
  fieldNames: string[];
  tableName: string;
  whereInputName: string;
  orderByInputName: string;
  objectTypeName: string;
}) {
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
      directives: [
        {
          name: 'mysqlSelect',
          args: {
            subgraph: subgraphName,
            table: foreignTableName,
            columnMap: [[foreignColumnName, columnName]],
          },
        },
        {
          name: 'mysqlTableForeign',
          args: {
            subgraph: subgraphName,
            columnName: tableForeign.COLUMN_NAME,
          },
        },
      ],
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
      directives: [
        {
          name: 'mysqlSelect',
          args: {
            subgraph: subgraphName,
            table: tableName,
            columnMap: [[columnName, foreignColumnName]],
          },
        },
      ],
    },
  });
}
