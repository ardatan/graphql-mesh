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
  GraphQLSchema,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLList,
  GraphQLResolveInfo,
  GraphQLScalarType,
  Kind,
  ValueNode,
  GraphQLOutputType,
  GraphQLInputType,
} from 'graphql';
import { BigIntResolver as GraphQLBigInt, DateTimeResolver as GraphQLDateTime } from 'graphql-scalars';
import { upperCase } from 'upper-case';
import { pascalCase } from 'pascal-case';
import { camelCase } from 'camel-case';
import graphqlFields from 'graphql-fields';

interface ColumnInfo {
  Type: string;
  Field: string;
  Comment?: string;
  Key?: 'PRI' | 'MUL';
  Null?: 'NO' | 'YES';
  Default?: any;
}

const createDummyScalar = (name: string) =>
  new GraphQLScalarType({
    name,
    serialize: data => (data.toJSON ? data.toJSON() : data.toString()),
    parseValue: data => data,
    parseLiteral(ast: ValueNode, variables): any {
      switch (ast.kind) {
        case Kind.LIST:
          return ast.values.map(value => this.parseLiteral(value, variables));
        case Kind.VARIABLE:
          return variables[ast.name.value];
        case Kind.NULL:
          return null;
        case Kind.BOOLEAN:
        case Kind.INT:
        case Kind.FLOAT:
        case Kind.STRING:
        case Kind.ENUM:
          return ast.value;
        case Kind.OBJECT:
          return ast.fields.reduce(
            (prev, curr) => ({ ...prev, [curr.name.value]: this.parseLiteral(curr.value, variables) }),
            {} as any
          );
      }
    },
  });

// TODO: Move this to graphql-scalars
const GraphQLBlob = new GraphQLScalarType({
  name: 'Blob',
  serialize: (value: any) => Buffer.from(value, 'binary'),
  parseValue: (value: any) => Buffer.from(value, 'binary'),
  parseLiteral: (ast: ValueNode) => {
    if (ast.kind !== Kind.STRING) {
      throw new Error('Invalid Blob');
    }
    return Buffer.from(ast.value, 'binary');
  },
});

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
    ['time', GraphQLString], // Implement those in graphql-scalars
    ['datetime', GraphQLDateTime],
    ['timestamp', GraphQLDateTime],
    ['year', GraphQLString],
    ['blob', GraphQLBlob],
    ['longblob', GraphQLBlob],
  ]);

  private outputTypeMap = new Map<string, GraphQLObjectType>();

  private queryFields: GraphQLFieldConfigMap<any, any> = {};
  private mutationFields: GraphQLFieldConfigMap<any, any> = {};

  private connection: Connection;
  constructor(connectionString: string) {
    this.connection = createConnection(connectionString);
  }

  private async query<T>(queryStatement: string, variables?: any[]): Promise<T[] & { insertId: string }> {
    return new Promise((resolve, reject) => {
      this.connection.query(queryStatement, variables, function (error, results) {
        if (error) {
          return reject(error);
        }
        return resolve(results);
      });
    });
  }

  private getColumnsForTableName(tableName: string): Promise<ColumnInfo[]> {
    return this.query(`SHOW FULL FIELDS FROM ??`, [tableName]);
  }

  private async getTableNames() {
    const results = await this.query<{ TABLE_NAME: string }>(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ?`,
      [this.connection.config.database]
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
      let columnGraphQLType: GraphQLInputType & GraphQLOutputType;
      if (column.Key) {
        columnGraphQLType = GraphQLID;
        if (column.Key === 'PRI') {
          primaryKeyFieldName = fieldName;
        }
      } else if (column.Type.startsWith('enum(')) {
        const enumValues = column.Type.replace(`enum('`, '').replace(`')`, '').split(`','`);
        if (enumValues.some(value => !isNaN(Number(value)))) {
          columnGraphQLType = GraphQLInt;
        } else {
          columnGraphQLType = new GraphQLEnumType({
            name: pascalCase(tableName + '_' + fieldName),
            values: enumValues.reduce(
              (prev, curr) => ({ ...prev, [upperCase(camelCase(curr))]: { value: curr } }),
              {} as GraphQLEnumValueConfigMap
            ),
          });
        }
      } else {
        const columnTypeName = column.Type.split('(')[0];
        columnGraphQLType = this.scalarsMap.get(columnTypeName)!;
        if (!columnGraphQLType) {
          console.warn(`Unknown type: ${columnTypeName}. Adding a dummy scalar`);
          columnGraphQLType = createDummyScalar(pascalCase(columnTypeName));
          this.scalarsMap.set(columnTypeName, columnGraphQLType);
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
        const { marks, fields } = this.getFields(info, outputFields);
        return this.query(`SELECT ${marks} FROM ??`, [...fields, tableName]);
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
        const { marks, fields } = this.getFields(info, outputFields);
        const result = await this.query(`SELECT ${marks} FROM ?? WHERE ?? = ?`, [
          ...fields,
          tableName,
          primaryKeyFieldName,
          args[primaryKeyFieldName],
        ]);
        return result && result[0];
      },
    };

    const createOperationName = camelCase('create_' + tableName);
    this.mutationFields[createOperationName] = {
      type: outputType,
      args: createInputFields,
      resolve: async (root, args, context, info) => {
        const argumentNames = Object.keys(args);
        const argumentValues = Object.values(args);
        const fieldMarks = argumentNames.map(_ => '??').join(',');
        const valueMarks = argumentValues.map(_ => '?').join(',');
        const insertResult = await this.query(`INSERT INTO ?? (${fieldMarks}) VALUES (${valueMarks})`, [
          tableName,
          ...argumentNames,
          ...argumentValues,
        ]);

        const { marks, fields } = this.getFields(info, outputFields);
        const result = await this.query(`SELECT ${marks} from ?? where ??=?;`, [
          ...fields,
          tableName,
          primaryKeyFieldName,
          insertResult.insertId || args[primaryKeyFieldName],
        ]);
        return result && result[0];
      },
    };

    const updateOperationName = camelCase('update_' + tableName);
    this.mutationFields[updateOperationName] = {
      type: outputType,
      args: updateInputFields,
      resolve: async (root, args, context, info) => {
        await this.query(
          `UPDATE ${tableName} SET ${Object.entries(args)
            .map(([key, value]) => `??=?`)
            .join(',')}`,
          [tableName, Object.entries(args).flat()]
        );
        const { marks, fields } = this.getFields(info, outputFields);
        const result = await this.query(`SELECT ${marks} FROM ?? WHERE ??=?`, [
          ...fields,
          tableName,
          primaryKeyFieldName,
          args[primaryKeyFieldName],
        ]);
        return result && result[0];
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
        await this.query(`DELETE FROM ?? WHERE ??=?`, [tableName, primaryKeyFieldName, args[primaryKeyFieldName]]);
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

  private getFields(
    info: GraphQLResolveInfo,
    outputFields: GraphQLFieldConfigMap<any, any>
  ): { marks: string; fields: string[] } {
    // There might be relational fields so we need to make sure fields are in that table.
    const fields = Object.keys(graphqlFields(info)).filter(fieldName => fieldName in outputFields);
    return {
      marks: fields.map(_ => '??').join(','),
      fields,
    };
  }
}
