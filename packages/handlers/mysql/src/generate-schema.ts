import { createConnection, Connection } from 'mysql';
import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLObjectType,
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLID,
  GraphQLNonNull,
  GraphQLType,
  GraphQLSchema,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLList,
} from 'graphql';
import { BigIntResolver as GraphQLBigInt, DateTimeResolver as GraphQLDateTime } from 'graphql-scalars';
import { camelCase, pascalCase } from 'change-case';
import graphqlFields from 'graphql-fields';

interface ColumnInfo {
  Type: string;
  Field: string;
  Comment?: string;
  Key?: 'PRI' | 'MUL';
  Null?: 'NO' | 'YES';
  Default?: any;
}

export class MySQLGraphQLSchemaFactory {
  private scalarsMap = new Map([
    ['varchar', GraphQLString],
    ['char', GraphQLString],
    ['tinytext', GraphQLString],
    ['text', GraphQLString],
    ['mediumtext', GraphQLString],
    ['longtext', GraphQLString],
    ['int', GraphQLInt],
    ['tinyint', GraphQLInt],
    ['smallint', GraphQLInt],
    ['mediumint', GraphQLInt],
    ['bigint', GraphQLBigInt],
    ['float', GraphQLFloat],
    ['double', GraphQLFloat],
    ['real', GraphQLFloat],
    ['decimal', GraphQLFloat],
    ['date', GraphQLDateTime],
    ['time', GraphQLString],
    ['datetime', GraphQLDateTime],
    ['timestamp', GraphQLDateTime],
    ['year', GraphQLString],
  ]);

  private outputTypeMap = new Map<string, GraphQLObjectType>();

  private queryFields: GraphQLFieldConfigMap<any, any> = {};
  private mutationFields: GraphQLFieldConfigMap<any, any> = {};

  private connection: Connection;
  constructor(connectionString: string) {
    this.connection = createConnection(connectionString);
  }

  private async query<T>(queryStatement: string): Promise<T[] & { insertId: string }> {
    return new Promise((resolve, reject) => {
      this.connection.query(queryStatement, function (error, results) {
        if (error) {
          return reject(error);
        }
        return resolve(results);
      });
    });
  }

  private getColumnsForTableName(tableName: string): Promise<ColumnInfo[]> {
    return this.query(`SHOW FULL FIELDS FROM ${tableName}`);
  }

  private async getTableNames() {
    const results = await this.query<{ TABLE_NAME: string }>(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = "employees"`
    );
    return results.map(result => result.TABLE_NAME);
  }

  private processColumns(tableName: string, columns: ColumnInfo[]) {
    const createInputFields: GraphQLInputFieldConfigMap = {};
    const updateInputFields: GraphQLInputFieldConfigMap = {};
    const outputFields: GraphQLFieldConfigMap<any, any> = {};
    let primaryKeyFieldName = 'id';
    for (const column of columns) {
      const fieldName = column.Field;
      let columnGraphQLType: GraphQLType;
      if (column.Key) {
        columnGraphQLType = GraphQLID;
        if (column.Key === 'PRI') {
          primaryKeyFieldName = fieldName;
        }
      } else if (column.Type.startsWith('enum(')) {
        const enumValues = column.Type.replace(`enum('`, '').replace(`')`, '').split(`','`);
        columnGraphQLType = new GraphQLEnumType({
          name: pascalCase(fieldName),
          values: enumValues.reduce(
            (prev, curr) => ({ ...prev, [curr]: { value: curr } }),
            {} as GraphQLEnumValueConfigMap
          ),
        });
      } else {
        const columnTypeName = column.Type.split('(')[0];
        columnGraphQLType = this.scalarsMap.get(columnTypeName)!;
        if (!columnGraphQLType) {
          throw new Error(`Unknown type: ${columnTypeName}`);
        }
      }
      outputFields[fieldName] = {
        type: column.Null === 'NO' ? new GraphQLNonNull(columnGraphQLType) : columnGraphQLType,
        description: column.Comment,
      };
      createInputFields[fieldName] = {
        type: column.Null === 'NO' && !column.Default ? new GraphQLNonNull(columnGraphQLType) : columnGraphQLType,
        description: column.Comment,
      };
      updateInputFields[fieldName] = {
        type: column.Key === 'PRI' ? new GraphQLNonNull(columnGraphQLType) : columnGraphQLType,
        description: column.Comment,
      };
    }
    const outputType = new GraphQLObjectType({
      name: pascalCase(tableName),
      fields: outputFields,
      description: 'Object Type for table :' + tableName,
    });

    this.outputTypeMap.set(tableName, outputType);

    const readAllOperationName = camelCase('getAll_' + tableName);
    this.queryFields[readAllOperationName] = {
      type: new GraphQLList(outputType),
      resolve: async (root, args, context, info) => {
        const fields = Object.keys(graphqlFields(info));
        return this.query(`SELECT ${fields.join(',')} FROM ${tableName}`);
      },
    };

    const readOperationName = camelCase('get_' + tableName + '_By_' + primaryKeyFieldName);
    this.queryFields[readOperationName] = {
      type: outputType,
      args: {
        [primaryKeyFieldName]: {
          type: new GraphQLNonNull(GraphQLID),
        },
      },
      resolve: async (root, args, context, info) => {
        const fields = Object.keys(graphqlFields(info));
        const result = await this.query(`
                    SELECT 
                    ${fields.join(',')} 
                    FROM 
                    ${tableName} 
                    WHERE ${primaryKeyFieldName} = ${this.connection.escape(args[primaryKeyFieldName])}
                `);
        return result && result[0];
      },
    };

    const createOperationName = camelCase('create_' + tableName);
    this.mutationFields[createOperationName] = {
      type: outputType,
      args: createInputFields,
      resolve: async (root, args, context, info) => {
        const statement = `INSERT INTO ${tableName} (${Object.keys(args).join(',')}) VALUES (${Object.values(args)
          .map(field => {
            if (field instanceof Date) {
              return `STR_TO_DATE(${this.connection.escape(
                field
                  .toLocaleString('en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })
                  .replace(',', '')
              )}', '%m/%d/%Y %H:%i:%s')`;
            } else {
              return this.connection.escape(field);
            }
          })
          .join(',')})`;
        const result = await this.query(statement);
        const fields = Object.keys(graphqlFields(info));
        return this.query(
          `SELECT ${fields.join(',')} from ${tableName} where ${primaryKeyFieldName}=${this.connection.escape(
            result.insertId
          )};`
        );
      },
    };

    const updateOperationName = camelCase('update_' + tableName);
    this.mutationFields[updateOperationName] = {
      type: outputType,
      args: updateInputFields,
      resolve: async (root, args, context, info) => {
        await this.query(
          `UPDATE ${tableName} SET ${Object.entries(args)
            .map(entry => {
              const fieldName = entry[0];
              let fieldValue = entry[1];
              if (fieldValue instanceof Date) {
                fieldValue = `STR_TO_DATE(${this.connection.escape(
                  fieldValue
                    .toLocaleString('en-US', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })
                    .replace(',', '')
                )}', '%m/%d/%Y %H:%i:%s')`;
              } else {
                fieldValue = this.connection.escape(fieldValue);
              }
              return `${fieldName}=${fieldValue}`;
            })
            .join(',')}`
        );
        const fields = Object.keys(graphqlFields(info));
        return this.query(
          `SELECT ${fields.join(',')} FROM ${tableName} WHERE ${primaryKeyFieldName}=${this.connection.escape(
            args[primaryKeyFieldName]
          )}`
        );
      },
    };

    const deleteOperationName = camelCase('delete_' + tableName);
    this.mutationFields[deleteOperationName] = {
      type: GraphQLID,
      args: {
        [primaryKeyFieldName]: {
          type: new GraphQLNonNull(GraphQLID),
        },
      },
      resolve: async (root, args) => {
        await this.query(
          `DELETE FROM ${tableName} WHERE ${primaryKeyFieldName}=${this.connection.escape(args[primaryKeyFieldName])}`
        );
        return args[primaryKeyFieldName];
      },
    };
  }

  private async processTableName(tableName: string) {
    const columns = await this.getColumnsForTableName(tableName);
    return this.processColumns(tableName, columns);
  }

  public async buildGraphQLSchema() {
    const tableNames = await this.getTableNames();
    await Promise.all(tableNames.map(tableName => this.processTableName(tableName)));
    const queryType = new GraphQLObjectType({
      name: 'Query',
      fields: this.queryFields,
    });
    const mutationType = new GraphQLObjectType({
      name: 'Mutation',
      fields: this.mutationFields,
    });
    return new GraphQLSchema({
      query: queryType,
      mutation: mutationType,
    });
  }

  public async destroyConnection() {
    return new Promise((resolve, reject) => this.connection.end((err, data) => (err ? reject(err) : resolve(data))));
  }
}
