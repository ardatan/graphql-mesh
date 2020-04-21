import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { SchemaComposer, EnumTypeComposerValueConfigDefinition } from 'graphql-compose';
import { createConnection, TableForeign } from 'mysql';
import { upgrade, introspection } from 'mysql-utilities';
import { promisify } from 'util';
import { pascalCase } from 'pascal-case';
import graphqlFields from 'graphql-fields';
import { camelCase } from 'camel-case';
import {
  BigIntResolver as GraphQLBigInt,
  DateTimeResolver as GraphQLDateTime,
  JSONResolver as GraphQLJSON,
} from 'graphql-scalars';

export const SCALARS = {
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

const handler: MeshHandlerLibrary<YamlConfig.MySQLHandler> = {
  async getMeshSource({ config, hooks }) {
    const schemaComposer = new SchemaComposer();
    const connection = createConnection(config);
    const connect = promisify(connection.connect);
    await connect();
    upgrade(connection);
    introspection(connection);
    const getDatabaseTables = promisify(connection.databaseTables.bind(connection));
    const getTableFields = promisify(connection.fields.bind(connection));
    const getTableForeigns = promisify(connection.foreign.bind(connection));
    const getTablePrimaryKeys = promisify(connection.primary.bind(connection));
    const selectLimit = promisify(connection.selectLimit.bind(connection));
    const select = promisify(connection.select.bind(connection));
    const insert = promisify(connection.insert.bind(connection));
    const update = promisify(connection.update.bind(connection));
    const deleteRow = promisify(connection.delete.bind(connection));
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
    const tables = await getDatabaseTables(config.database);
    for (const tableName in tables) {
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
      const primaryKeys = await getTablePrimaryKeys(tableName);
      const fields = await getTableFields(tableName);
      for (const fieldName in fields) {
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
      }
      const tableForeigns = await getTableForeigns(tableName);
      for (const foreignName in tableForeigns) {
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
            resolve: async (root, args, context, info) => {
              const fieldMap = graphqlFields(info);
              const fields = Object.keys(fieldMap).filter(fieldName => Object.keys(fieldMap[fieldName]).length === 0);
              const where = {
                [foreignColumnName]: root[foreignColumnName],
                ...args?.where,
              };
              // Generate limit statement
              const limit: number[] = [args.limit, args.offset].filter(Boolean);
              if (limit.length) {
                return selectLimit(foreignTableName, fields, limit, where, args?.orderBy);
              } else {
                return select(foreignTableName, fields, where, args?.orderBy);
              }
            },
          },
        });
      }
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
          resolve: async (root, args, context, info) => {
            const fieldMap = graphqlFields(info);
            const fields: string[] = [];
            for (const fieldName in fieldMap) {
              const subFieldMap = fieldMap[fieldName];
              if (Object.keys(subFieldMap).length === 0) {
                fields.push(fieldName);
              } else {
                const tableForeign = schemaComposer.getOTC(objectTypeName).getField(fieldName)
                  .extensions as TableForeign;
                fields.push(tableForeign.COLUMN_NAME);
              }
            }
            // Generate limit statement
            const limit = [args.limit, args.offset].filter(Boolean);
            if (limit.length) {
              return selectLimit(tableName, fields, limit, args.where, args?.orderBy);
            } else {
              return select(tableName, fields, args.where, args?.orderBy);
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
          resolve: async (root, args, context, info) => {
            const { recordId } = await insert(args);
            const fieldMap = graphqlFields(info);
            const fields = Object.keys(fieldMap).filter(fieldName => Object.keys(fieldMap[fieldName]).length === 0);
            const where: any = {};
            for (const primaryKeyName in primaryKeys) {
              const primaryKey = primaryKeys[primaryKeyName];
              const columnName = primaryKey.Column_name;
              where[columnName] = args[columnName] || recordId;
            }
            const result = await select(tableName, fields, where, {});
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
          resolve: async (root, args, context, info) => {
            await update(
              tableName,
              {
                [tableName]: args[tableName],
              },
              args.where
            );
            const fieldMap = graphqlFields(info);
            const fields = Object.keys(fieldMap).filter(fieldName => Object.keys(fieldMap[fieldName]).length === 0);
            const result = await select(tableName, fields, args.where, {});
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
          resolve: async (root, args) => {
            await deleteRow(tableName, args.where);
            return true;
          },
        },
      });
    }
    hooks.on('destroy', () => connection.end());

    const schema = schemaComposer.buildSchema();
    return {
      schema,
    };
  },
};

export default handler;
