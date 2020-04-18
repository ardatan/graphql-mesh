import {
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLScalarType,
  GraphQLFieldConfigMap,
  GraphQLEnumType,
  GraphQLEnumTypeConfig,
  GraphQLInputObjectTypeConfig,
  GraphQLObjectTypeConfig,
  GraphQLList,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLSchema,
} from 'graphql';
import { BigIntResolver as GraphQLBigInt } from 'graphql-scalars';
import { AnyNestedObject, load } from 'protobufjs';
import { isAbsolute, join } from 'path';
import { Readable } from 'stream';
import { asyncMap } from 'iter-tools';
import { withAsyncIteratorCancel } from './with-async-iterator-cancel';
import grpcCaller from 'grpc-caller';
import { camelCase } from 'camel-case';
import { pascalCase } from 'pascal-case';

const SCALARS: [string, GraphQLScalarType][] = [
  ['int32', GraphQLInt],
  ['int64', GraphQLBigInt],
  ['float', GraphQLFloat],
  ['double', GraphQLFloat],
  ['string', GraphQLString],
  ['bool', GraphQLBoolean],
];

export interface GrpcGraphQLSchemaConfig {
  protoFilePath: string;
  serviceName: string;
  packageName: string;
  endpoint: string;
}

export class GrpcGraphQLSchemaFactory {
  private inputTypeMap: Map<string, GraphQLInputType>;
  private outputTypeMap: Map<string, GraphQLOutputType>;
  private nonSubscriptionFields: GraphQLFieldConfigMap<any, any> = {};
  private subscriptionFields: GraphQLFieldConfigMap<any, any> = {};
  private futureJobs: Function[] = [];
  constructor(private config: GrpcGraphQLSchemaConfig) {
    this.inputTypeMap = new Map(SCALARS);
    this.outputTypeMap = new Map(SCALARS);
    this.outputTypeMap.set(
      'ServerStatus',
      new GraphQLObjectType({
        name: 'ServerStatus',
        description: 'status of the server',
        fields: () => ({
          status: {
            type: GraphQLString,
            descripton: 'status string',
          },
        }),
      })
    );
  }

  async init() {
    const absoluteProtoFilePath = isAbsolute(this.config.protoFilePath)
      ? this.config.protoFilePath
      : join(process.cwd(), this.config.protoFilePath);
    const root = await load(absoluteProtoFilePath);
    const nested = root.toJSON({
      keepComments: true,
    });
    this.visit(nested, '', '');
    this.futureJobs.forEach(futureJob => futureJob());
  }

  visit(nested: AnyNestedObject, name: string, currentPath: string) {
    if ('values' in nested) {
      let typeName = name;
      if (currentPath !== this.config.packageName) {
        typeName = pascalCase(currentPath.split('.').join('_') + '_' + typeName);
      }
      const enumTypeConfig: GraphQLEnumTypeConfig = {
        name: typeName,
        values: {},
      };
      for (const key in nested.values) {
        enumTypeConfig.values[key] = {
          value: key,
        };
      }
      const enumType = new GraphQLEnumType(enumTypeConfig);
      this.inputTypeMap.set(currentPath + '.' + name, enumType);
    } else if ('fields' in nested) {
      let typeName = name;
      if (currentPath !== this.config.packageName) {
        typeName = pascalCase(currentPath.split('.').join('_') + '_' + typeName);
      }
      const inputTypeConfig: GraphQLInputObjectTypeConfig = {
        name: pascalCase(typeName + '_Input'),
        fields: {},
      };
      const outputTypeConfig: GraphQLObjectTypeConfig<any, any> = {
        name: typeName,
        fields: {},
      };
      for (const fieldName in nested.fields) {
        const { type, rule } = nested.fields[fieldName];
        let inputType = this.inputTypeMap.get(type) || this.inputTypeMap.get(currentPath + '.' + type);
        let outputType = this.outputTypeMap.get(type) || this.outputTypeMap.get(currentPath + '.' + type);
        // If not resolved, do it later
        if (!inputType || !outputType) {
          this.futureJobs.push(() => this.visit(nested, name, currentPath));
          return;
        }
        if (rule === 'repeated') {
          inputType = new GraphQLList(inputType);
          outputType = new GraphQLList(outputType);
        }
        inputTypeConfig.fields[fieldName] = {
          type: inputType,
        };
        outputTypeConfig.fields[fieldName] = {
          type: outputType,
        };
      }
      const inputType = new GraphQLInputObjectType(inputTypeConfig);
      const outputType = new GraphQLObjectType(outputTypeConfig);
      this.inputTypeMap.set(currentPath + '.' + name, inputType);
      this.outputTypeMap.set(currentPath + '.' + name, outputType);
    } else if ('methods' in nested) {
      const methods = nested.methods;
      const client = grpcCaller(this.config.endpoint, this.config.protoFilePath, name, null, {
        'grpc.max_send_message_length': -1,
        'grpc.max_receive_message_length': -1,
      });
      for (const methodName in methods) {
        const method = methods[methodName];
        const inputType =
          this.inputTypeMap.get(method.requestType) || this.inputTypeMap.get(currentPath + '.' + method.requestType);
        // If not resolved, do it later
        if (!inputType) {
          this.futureJobs.push(() => this.visit(nested, name, currentPath));
          return;
        }
        const args: GraphQLFieldConfigArgumentMap = {
          input: {
            type: inputType,
            defaultValue: {},
          },
        };
        let rootFieldName = methodName;
        if (name !== this.config.serviceName) {
          rootFieldName = camelCase(name + '_' + rootFieldName);
        }
        if (currentPath !== this.config.packageName) {
          rootFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootFieldName);
        }
        const outputType =
          this.outputTypeMap.get(method.responseType) ||
          this.outputTypeMap.get(currentPath + '.' + method.responseType);
        // If not resolved, do it later
        if (!outputType) {
          this.futureJobs.push(() => this.visit(nested, name, currentPath));
          return;
        }
        const fieldConfig: GraphQLFieldConfig<any, any> = {
          type: outputType,
          args,
        };
        if (method.responseStream) {
          this.subscriptionFields[rootFieldName] = {
            ...fieldConfig,
            subscribe: async (__, args) => {
              const response: Readable & { cancel: () => void } = await client[methodName](args.input, {});

              response.on('error', (error: Error & { code: number }) => {
                if (error.code === 1) {
                  // cancelled
                  response.removeAllListeners('error');
                  response.removeAllListeners();
                }
              });

              response.on('end', () => {
                response.removeAllListeners();
              });

              const asyncIterator = asyncMap(data => ({ [rootFieldName]: data }), response);

              return withAsyncIteratorCancel(asyncIterator, () => {
                response.cancel();
              });
            },
          };
        } else {
          this.nonSubscriptionFields[rootFieldName] = {
            ...fieldConfig,
            resolve: (_, args) => {
              return client[methodName](
                args.input,
                {},
                {
                  deadline: Date.now() + (Number(process.env.REQUEST_TIMEOUT) || 200000),
                }
              );
            },
          };
        }
      }
    } else if ('nested' in nested) {
      for (const key in nested.nested) {
        const currentNested = nested.nested[key];
        this.visit(currentNested, key, currentPath ? currentPath + '.' + name : name);
      }
    }
  }

  buildSchema() {
    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          foo: {
            type: GraphQLString,
            resolve: () => 'FOO',
          },
        },
      }),
      mutation: new GraphQLObjectType({
        name: 'Mutation',
        fields: this.nonSubscriptionFields,
      }),
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: this.subscriptionFields,
      }),
    });
  }
}
