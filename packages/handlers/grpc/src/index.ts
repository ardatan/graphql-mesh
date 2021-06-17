/* eslint-disable import/no-duplicates */
import './patchLongJs';
import { GetMeshSourceOptions, KeyValueCache, MeshHandler, YamlConfig } from '@graphql-mesh/types';
import { withCancel } from '@graphql-mesh/utils';
import {
  ChannelCredentials,
  ClientReadableStream,
  ClientUnaryCall,
  Metadata,
  credentials,
  loadPackageDefinition,
} from '@grpc/grpc-js';
import { loadFileDescriptorSetFromObject } from '@grpc/proto-loader';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLBigInt, GraphQLByte, GraphQLUnsignedInt } from 'graphql-scalars';
import _ from 'lodash';
import { AnyNestedObject, IParseOptions, Message, RootConstructor } from 'protobufjs';
import protobufjs from 'protobufjs';
import { promisify } from 'util';
import grpcReflection from 'grpc-reflection-js';
import { IFileDescriptorSet } from 'protobufjs/ext/descriptor';
import descriptor from 'protobufjs/ext/descriptor/index.js';

import { ClientMethod, addIncludePathResolver, addMetaDataToCall, getBuffer, getTypeName } from './utils';
import { GraphQLEnumTypeConfig, specifiedDirectives } from 'graphql';
import { join, isAbsolute } from 'path';
import { StoreProxy } from '@graphql-mesh/store';

const { Root } = protobufjs;

interface LoadOptions extends IParseOptions {
  includeDirs?: string[];
}

type DecodedDescriptorSet = Message<IFileDescriptorSet> & IFileDescriptorSet;

type RootJsonAndDecodedDescriptorSet = {
  rootJson: protobufjs.INamespace;
  decodedDescriptorSet: DecodedDescriptorSet;
};

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private baseDir: string;
  private cache: KeyValueCache;
  private rootJsonAndDecodedDescriptorSet: StoreProxy<RootJsonAndDecodedDescriptorSet>;

  constructor({ config, baseDir, cache, store }: GetMeshSourceOptions<YamlConfig.GrpcHandler>) {
    if (!config) {
      throw new Error('Config not specified!');
    }
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.rootJsonAndDecodedDescriptorSet = store.proxy('descriptorSet.proto', {
      codify: ({ rootJson, decodedDescriptorSet }) =>
        `
const { FileDescriptorSet } = require('protobufjs/ext/descriptor/index.js');

module.exports = {
  decodedDescriptorSet: descriptor.FileDescriptorSet.fromObject(${JSON.stringify(
    decodedDescriptorSet.toJSON(),
    null,
    2
  )}),
  rootJson: ${JSON.stringify(rootJson, null, 2)},
};
`.trim(),
      validate: () => {},
    });
  }

  getCachedDescriptorSet(creds: ChannelCredentials) {
    return this.rootJsonAndDecodedDescriptorSet.getWithSet(async () => {
      const root = new Root();
      if (this.config.useReflection) {
        const grpcReflectionServer = this.config.endpoint;
        const reflectionClient = new grpcReflection.Client(grpcReflectionServer, creds);
        await reflectionClient.listServices().then(services =>
          Promise.all(
            services.map(async (service: string | void) => {
              if (service && !service.startsWith('grpc.')) {
                return reflectionClient.fileContainingSymbol(service).then(serviceRoot => {
                  if (serviceRoot.nested) {
                    for (const namespace in serviceRoot.nested) {
                      if (Object.prototype.hasOwnProperty.call(serviceRoot.nested, namespace)) {
                        root.add(serviceRoot.nested[namespace]);
                      }
                    }
                  }
                });
              }
              return null;
            })
          )
        );
        root.resolveAll();
      } else if (this.config.descriptorSetFilePath) {
        let fileName = this.config.descriptorSetFilePath;
        if (typeof this.config.descriptorSetFilePath === 'object' && this.config.descriptorSetFilePath.file) {
          fileName = this.config.descriptorSetFilePath.file;
        }
        const descriptorSetBuffer = await getBuffer(fileName as string, this.cache, this.baseDir);
        let decodedDescriptorSet: DecodedDescriptorSet;
        try {
          const descriptorSetJSON = JSON.parse(descriptorSetBuffer.toString());
          decodedDescriptorSet = descriptor.FileDescriptorSet.fromObject(descriptorSetJSON) as DecodedDescriptorSet;
        } catch (e) {
          decodedDescriptorSet = descriptor.FileDescriptorSet.decode(descriptorSetBuffer) as DecodedDescriptorSet;
        }
        const descriptorSetRoot = (Root as RootConstructor).fromDescriptor(decodedDescriptorSet);
        root.add(descriptorSetRoot);
      } else {
        let fileName: string;
        let options: LoadOptions = {};
        if (typeof this.config.protoFilePath === 'object') {
          fileName = this.config.protoFilePath.file;
          options = {
            ...this.config.protoFilePath.load,
            includeDirs: this.config.protoFilePath.load.includeDirs?.map(includeDir =>
              isAbsolute(includeDir) ? includeDir : join(this.baseDir, includeDir)
            ),
          };
          if (options.includeDirs) {
            if (!Array.isArray(options.includeDirs)) {
              return Promise.reject(new Error('The includeDirs option must be an array'));
            }
            addIncludePathResolver(root, options.includeDirs);
          }
        } else {
          fileName = this.config.protoFilePath;
        }

        const protoDefinition = await root.load(fileName, options);
        protoDefinition.resolveAll();
      }

      return {
        rootJson: root.toJSON(),
        decodedDescriptorSet: root.toDescriptor('proto3'),
      };
    });
  }

  async getMeshSource() {
    let creds: ChannelCredentials;
    if (this.config.credentialsSsl) {
      const sslFiles = [
        getBuffer(this.config.credentialsSsl.privateKey, this.cache, this.baseDir),
        getBuffer(this.config.credentialsSsl.certChain, this.cache, this.baseDir),
      ];
      if (this.config.credentialsSsl.rootCA !== 'rootCA') {
        sslFiles.unshift(getBuffer(this.config.credentialsSsl.rootCA, this.cache, this.baseDir));
      }
      const [rootCA, privateKey, certChain] = await Promise.all(sslFiles);
      creds = credentials.createSsl(rootCA, privateKey, certChain);
    } else if (this.config.useHTTPS) {
      creds = credentials.createSsl();
    } else {
      creds = credentials.createInsecure();
    }

    this.config.requestTimeout = this.config.requestTimeout || 200000;

    const schemaComposer = new SchemaComposer();
    schemaComposer.add(GraphQLBigInt);
    schemaComposer.add(GraphQLByte);
    schemaComposer.add(GraphQLUnsignedInt);
    schemaComposer.createObjectTC({
      name: 'ServerStatus',
      description: 'status of the server',
      fields: {
        status: {
          type: 'String',
          description: 'status string',
        },
      },
    });

    const { rootJson, decodedDescriptorSet } = await this.getCachedDescriptorSet(creds);

    const packageDefinition = loadFileDescriptorSetFromObject(decodedDescriptorSet);

    const grpcObject = loadPackageDefinition(packageDefinition);

    const walkToFindTypePath = (pathWithName: string[], baseTypePath: string[]) => {
      const currentWalkingPath = [...pathWithName];
      while (!_.has(rootJson.nested, currentWalkingPath.concat(baseTypePath).join('.nested.'))) {
        if (!currentWalkingPath.length) {
          break;
        }
        currentWalkingPath.pop();
      }
      return currentWalkingPath.concat(baseTypePath);
    };

    const visit = async (nested: AnyNestedObject, name: string, currentPath: string[]) => {
      const pathWithName = [...currentPath, ...name.split('.')].filter(Boolean);
      if ('nested' in nested) {
        await Promise.all(
          Object.keys(nested.nested).map(async (key: string) => {
            const currentNested = nested.nested[key];
            await visit(currentNested, key, pathWithName);
          })
        );
      }
      const typeName = pathWithName.join('_');
      if ('values' in nested) {
        const enumTypeConfig: GraphQLEnumTypeConfig = {
          name: typeName,
          values: {},
        };
        for (const [key, value] of Object.entries(nested.values)) {
          enumTypeConfig.values[key] = {
            value,
          };
        }
        schemaComposer.createEnumTC(enumTypeConfig);
      } else if ('fields' in nested) {
        const inputTC = schemaComposer.createInputTC({
          name: typeName + '_Input',
          fields: {},
        });
        const outputTC = schemaComposer.createObjectTC({
          name: typeName,
          fields: {},
        });
        const fieldEntries = Object.entries(nested.fields);
        if (!fieldEntries.length) {
          // This is a empty proto type
          inputTC.addFields({
            _: {
              type: 'Boolean',
            },
          });
          outputTC.addFields({
            _: {
              type: 'Boolean',
            },
          });
        }
        await Promise.all(
          fieldEntries.map(async ([fieldName, { type, rule }]) => {
            const baseFieldTypePath = type.split('.');
            inputTC.addFields({
              [fieldName]: {
                type: () => {
                  const fieldTypePath = walkToFindTypePath(pathWithName, baseFieldTypePath);
                  const fieldInputTypeName = getTypeName(schemaComposer, fieldTypePath, true);
                  return rule === 'repeated' ? `[${fieldInputTypeName}]` : fieldInputTypeName;
                },
              },
            });
            outputTC.addFields({
              [fieldName]: {
                type: () => {
                  const fieldTypePath = walkToFindTypePath(pathWithName, baseFieldTypePath);
                  const fieldInputTypeName = getTypeName(schemaComposer, fieldTypePath, false);
                  return rule === 'repeated' ? `[${fieldInputTypeName}]` : fieldInputTypeName;
                },
              },
            });
          })
        );
      } else if ('methods' in nested) {
        const objPath = pathWithName.join('.');
        const ServiceClient = _.get(grpcObject, objPath);
        if (typeof ServiceClient !== 'function') {
          throw new Error(`Object at path ${objPath} is not a Service constructor`);
        }
        const client = new ServiceClient(this.config.endpoint, creds);
        const methods = nested.methods;
        await Promise.all(
          Object.entries(methods).map(async ([methodName, method]) => {
            const rootFieldName = [...pathWithName, methodName].join('_');
            const baseRequestTypePath = method.requestType?.split('.');
            const fieldConfig = {
              type: () => {
                const baseResponseTypePath = method.responseType?.split('.');
                if (baseResponseTypePath) {
                  const responseTypePath = walkToFindTypePath(pathWithName, baseResponseTypePath);
                  return getTypeName(schemaComposer, responseTypePath, false);
                }
                return 'Void';
              },
              args: {
                input: baseRequestTypePath
                  ? {
                      type: () => {
                        const requestTypePath = walkToFindTypePath(pathWithName, baseRequestTypePath);
                        return getTypeName(schemaComposer, requestTypePath, true);
                      },
                      defaultValue: {},
                    }
                  : undefined,
              },
            };
            if (method.responseStream) {
              const clientMethod: ClientMethod = (input: unknown, metaData: Metadata) => {
                const responseStream = client[methodName](input, metaData) as ClientReadableStream<any>;
                let isCancelled = false;
                const responseStreamWithCancel = withCancel(responseStream, () => {
                  if (!isCancelled) {
                    responseStream.call?.cancelWithStatus(0, 'Cancelled by GraphQL Mesh');
                    isCancelled = true;
                  }
                });
                return responseStreamWithCancel;
              };
              schemaComposer.Subscription.addFields({
                [rootFieldName]: {
                  ...fieldConfig,
                  subscribe: (__, args: Record<string, unknown>, context: Record<string, unknown>) =>
                    addMetaDataToCall(clientMethod, args.input, context, this.config.metaData),
                  resolve: (payload: unknown) => payload,
                },
              });
            } else {
              const clientMethod = promisify<ClientUnaryCall>(client[methodName].bind(client) as ClientMethod);
              const identifier = methodName.toLowerCase();
              const rootTC =
                identifier.startsWith('get') || identifier.startsWith('list')
                  ? schemaComposer.Query
                  : schemaComposer.Mutation;
              rootTC.addFields({
                [rootFieldName]: {
                  ...fieldConfig,
                  resolve: (_, args: Record<string, unknown>, context: Record<string, unknown>) =>
                    addMetaDataToCall(clientMethod, args.input, context, this.config.metaData),
                },
              });
            }
          })
        );
        const pingFieldName = pathWithName.join('_') + '_ping';
        schemaComposer.Query.addFields({
          [pingFieldName]: {
            type: 'ServerStatus',
            resolve: () => ({ status: 'online' }),
          },
        });
      }
    };
    await visit(rootJson, '', []);

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const schema = schemaComposer.buildSchema();

    return {
      schema,
    };
  }
}
