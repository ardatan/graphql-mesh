import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { GraphQLEnumTypeConfig } from 'graphql';
import { GraphQLBigInt } from 'graphql-scalars';
import { AnyNestedObject, load } from 'protobufjs';
import { isAbsolute, join } from 'path';
import grpcCaller, { GrpcResponseStream } from 'grpc-caller';
import { camelCase } from 'camel-case';
import { pascalCase } from 'pascal-case';
import { SchemaComposer } from 'graphql-compose';
import { withCancel } from '@graphql-mesh/utils';

const SCALARS = {
  int32: 'Int',
  int64: 'BigInt',
  float: 'Float',
  double: 'Float',
  string: 'String',
  bool: 'Boolean',
};

const handler: MeshHandlerLibrary<YamlConfig.GrpcHandler> = {
  async getMeshSource({ config }) {
    if (!config) {
      throw new Error('Config not specified!');
    }

    config.requestTimeout = config.requestTimeout || 200000;

    const schemaComposer = new SchemaComposer();
    schemaComposer.add(GraphQLBigInt);
    schemaComposer.createObjectTC({
      name: 'ServerStatus',
      description: 'status of the server',
      fields: {
        status: {
          type: 'String',
          descripton: 'status string',
        },
      },
    });

    const ENUMS = new Set<string>();

    function getTypeName(typePath: string, isInput: boolean) {
      if (typePath in SCALARS) {
        return SCALARS[typePath];
      }
      let baseTypeName = pascalCase(
        typePath
          .replace(config.packageName + '.', '')
          .split('.')
          .join('_')
      );
      if (!ENUMS.has(baseTypeName) && isInput) {
        baseTypeName += 'Input';
      }
      return baseTypeName;
    }

    async function visit(nested: AnyNestedObject, name: string, currentPath: string) {
      if ('values' in nested) {
        let typeName = name;
        if (currentPath !== config.packageName) {
          typeName = pascalCase(currentPath.split('.').join('_') + '_' + typeName);
        }
        const enumTypeConfig: GraphQLEnumTypeConfig = {
          name: typeName,
          values: {},
        };
        for (const [key, value] of Object.entries(nested.values)) {
          enumTypeConfig.values[key] = {
            value: value,
          };
        }
        ENUMS.add(typeName);
        schemaComposer.createEnumTC(enumTypeConfig);
      } else if ('fields' in nested) {
        let typeName = name;
        if (currentPath !== config.packageName) {
          typeName = pascalCase(currentPath.split('.').join('_') + '_' + typeName);
        }
        const inputTC = schemaComposer.createInputTC({
          name: typeName + 'Input',
          fields: {},
        });
        const outputTC = schemaComposer.createObjectTC({
          name: typeName,
          fields: {},
        });
        for (const fieldName in nested.fields) {
          const { type, rule } = nested.fields[fieldName];
          inputTC.addFields({
            [fieldName]: {
              type: () => {
                const inputTypeName = getTypeName(type, true);
                return rule === 'repeated' ? `[${inputTypeName}]` : inputTypeName;
              },
            },
          });
          outputTC.addFields({
            [fieldName]: {
              type: () => {
                const typeName = getTypeName(type, false);
                return rule === 'repeated' ? `[${typeName}]` : typeName;
              },
            },
          });
        }
      } else if ('methods' in nested) {
        const methods = nested.methods;
        const client = grpcCaller(config.endpoint, config.protoFilePath, name, null, {
          'grpc.max_send_message_length': -1,
          'grpc.max_receive_message_length': -1,
        });
        for (const methodName in methods) {
          const method = methods[methodName];
          let rootFieldName = methodName;
          if (name !== config.serviceName) {
            rootFieldName = camelCase(name + '_' + rootFieldName);
          }
          if (currentPath !== config.packageName) {
            rootFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootFieldName);
          }
          const fieldConfig = {
            type: () => getTypeName(method.responseType, false),
            args: {
              input: {
                type: () => getTypeName(method.requestType, true),
                defaultValue: {},
              },
            },
          };
          if (method.responseStream) {
            schemaComposer.Subscription.addFields({
              [rootFieldName]: {
                ...fieldConfig,
                subscribe: (__, args) => {
                  const responseStream = client[methodName](args.input, {}) as GrpcResponseStream;
                  return withCancel(responseStream, () => responseStream.cancel());
                },
                resolve: (payload: any) => payload,
              },
            });
          } else {
            const identifier = rootFieldName.toLowerCase();
            const rootTC = identifier.startsWith('get') ? schemaComposer.Query : schemaComposer.Mutation;
            rootTC.addFields({
              [rootFieldName]: {
                ...fieldConfig,
                resolve: (_, args) =>
                  client[methodName](
                    args.input,
                    {},
                    {
                      deadline: Date.now() + config.requestTimeout,
                    }
                  ),
              },
            });
          }
        }
        let rootPingFieldName = 'ping';
        if (name !== config.serviceName) {
          rootPingFieldName = camelCase(name + '_' + rootPingFieldName);
        }
        if (currentPath !== config.packageName) {
          rootPingFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootPingFieldName);
        }
        schemaComposer.Query.addFields({
          [rootPingFieldName]: {
            type: 'ServerStatus',
            resolve: () => ({ status: 'online' }),
          },
        });
      } else if ('nested' in nested) {
        for (const key in nested.nested) {
          const currentNested = nested.nested[key];
          visit(currentNested, key, currentPath ? currentPath + '.' + name : name);
        }
      }
    }

    const absoluteProtoFilePath = isAbsolute(config.protoFilePath)
      ? config.protoFilePath
      : join(process.cwd(), config.protoFilePath);
    const root = await load(absoluteProtoFilePath);
    const nested = root.toJSON({
      keepComments: true,
    });
    visit(nested, '', '');

    const schema = schemaComposer.buildSchema();

    return {
      schema,
    };
  },
};

export default handler;
