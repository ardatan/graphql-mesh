import { GraphQLEnumTypeConfig } from 'graphql';
import { BigIntResolver as GraphQLBigInt } from 'graphql-scalars';
import { AnyNestedObject, load } from 'protobufjs';
import { isAbsolute, join } from 'path';
import { Readable } from 'stream';
import { asyncMap } from 'iter-tools';
import { withAsyncIteratorCancel } from './with-async-iterator-cancel';
import grpcCaller from 'grpc-caller';
import { camelCase } from 'camel-case';
import { pascalCase } from 'pascal-case';
import { SchemaComposer } from 'graphql-compose';

const SCALARS = {
  int32: 'Int',
  int64: 'BigInt',
  float: 'Float',
  double: 'Float',
  string: 'String',
  bool: 'Boolean',
};

export interface GrpcGraphQLSchemaConfig {
  protoFilePath: string;
  endpoint: string;
  serviceName?: string;
  packageName?: string;
}

export class GrpcGraphQLSchemaFactory {
  schemaComposer: SchemaComposer<any>;
  constructor(private config: GrpcGraphQLSchemaConfig) {
    this.schemaComposer = new SchemaComposer();
    this.schemaComposer.add(GraphQLBigInt);
    this.schemaComposer.createObjectTC({
      name: 'ServerStatus',
      description: 'status of the server',
      fields: {
        status: {
          type: 'String',
          descripton: 'status string',
        },
      },
    });
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
  }

  getTypeName(typePath: string, isInput: boolean) {
    if (typePath in SCALARS) {
      return SCALARS[typePath];
    }
    let baseTypeName = pascalCase(
      typePath
        .replace(this.config.packageName + '.', '')
        .split('.')
        .join('_')
    );
    if (isInput) {
      baseTypeName += 'Input';
    }
    return baseTypeName;
  }

  async visit(nested: AnyNestedObject, name: string, currentPath: string) {
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
      this.schemaComposer.createEnumTC(enumTypeConfig);
    } else if ('fields' in nested) {
      let typeName = name;
      if (currentPath !== this.config.packageName) {
        typeName = pascalCase(currentPath.split('.').join('_') + '_' + typeName);
      }
      const inputTC = this.schemaComposer.createInputTC({
        name: typeName + 'Input',
        fields: {},
      });
      const outputTC = this.schemaComposer.createObjectTC({
        name: typeName,
        fields: {},
      });
      for (const fieldName in nested.fields) {
        const { type, rule } = nested.fields[fieldName];
        const typeName = this.getTypeName(type, false);
        const inputTypeName = this.getTypeName(type, true);
        inputTC.addFields({
          [fieldName]: {
            type: rule === 'repeated' ? `[${inputTypeName}]` : inputTypeName,
          },
        });
        outputTC.addFields({
          [fieldName]: {
            type: rule === 'repeated' ? `[${typeName}]` : typeName,
          },
        });
      }
    } else if ('methods' in nested) {
      const methods = nested.methods;
      const client = grpcCaller(this.config.endpoint, this.config.protoFilePath, name, null, {
        'grpc.max_send_message_length': -1,
        'grpc.max_receive_message_length': -1,
      });
      for (const methodName in methods) {
        const method = methods[methodName];
        const inputType = this.getTypeName(method.requestType, true);
        let rootFieldName = methodName;
        if (name !== this.config.serviceName) {
          rootFieldName = camelCase(name + '_' + rootFieldName);
        }
        if (currentPath !== this.config.packageName) {
          rootFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootFieldName);
        }
        const outputType = this.getTypeName(method.responseType, false);
        const fieldConfig = {
          type: outputType,
          args: {
            input: {
              type: inputType,
              defaultValue: {},
            },
          },
        };
        if (method.responseStream) {
          this.schemaComposer.Subscription.addFields({
            [rootFieldName]: {
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
            },
          });
        } else {
          const identifier = rootFieldName.toLowerCase();
          const rootTC = identifier.startsWith('get') ? this.schemaComposer.Query : this.schemaComposer.Mutation;
          rootTC.addFields({
            [rootFieldName]: {
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
            },
          });
        }
      }
      let rootPingFieldName = 'ping';
      if (name !== this.config.serviceName) {
        rootPingFieldName = camelCase(name + '_' + rootPingFieldName);
      }
      if (currentPath !== this.config.packageName) {
        rootPingFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootPingFieldName);
      }
      this.schemaComposer.Query.addFields({
        [rootPingFieldName]: {
          type: 'ServerStatus',
          resolve: () => {
            return client.ping(
              {},
              {},
              {
                deadline: Date.now() + (Number(process.env.REQUEST_TIMEOUT) || 200000),
              }
            );
          },
        },
      });
    } else if ('nested' in nested) {
      for (const key in nested.nested) {
        const currentNested = nested.nested[key];
        this.visit(currentNested, key, currentPath ? currentPath + '.' + name : name);
      }
    }
  }

  buildSchema() {
    return this.schemaComposer.buildSchema();
  }
}
