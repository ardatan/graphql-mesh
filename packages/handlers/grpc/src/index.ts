/* eslint-disable import/no-duplicates */
import './patchLongJs';
import { GetMeshSourceOptions, Logger, MeshHandler, YamlConfig } from '@graphql-mesh/types';
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
import { ObjectTypeComposerFieldConfigAsObjectDefinition, SchemaComposer } from 'graphql-compose';
import { GraphQLBigInt, GraphQLByte, GraphQLUnsignedInt, GraphQLVoid, GraphQLJSON } from 'graphql-scalars';
import _ from 'lodash';
import { AnyNestedObject, IParseOptions, Message, RootConstructor } from 'protobufjs';
import protobufjs from 'protobufjs';
import { promisify } from 'util';
import grpcReflection from 'grpc-reflection-js';
import { IFileDescriptorSet } from 'protobufjs/ext/descriptor';
import descriptor from 'protobufjs/ext/descriptor/index.js';

import { ClientMethod, addIncludePathResolver, addMetaDataToCall, getTypeName } from './utils';
import { GraphQLEnumTypeConfig, specifiedDirectives } from 'graphql';
import { join, isAbsolute } from 'path';
import { StoreProxy } from '@graphql-mesh/store';
import { promises as fsPromises } from 'fs';
import globby from 'globby';

const { readFile } = fsPromises;

const { Root } = protobufjs;

interface LoadOptions extends IParseOptions {
  includeDirs?: string[];
}

type DecodedDescriptorSet = Message<IFileDescriptorSet> & IFileDescriptorSet;

type RootJsonAndDecodedDescriptorSet = {
  rootJson: protobufjs.INamespace;
  decodedDescriptorSet: DecodedDescriptorSet;
};

const QUERY_METHOD_PREFIXES = ['get', 'list'];

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private baseDir: string;
  private rootJsonAndDecodedDescriptorSet: StoreProxy<RootJsonAndDecodedDescriptorSet>;
  private logger: Logger;

  constructor({ config, baseDir, store, logger }: GetMeshSourceOptions<YamlConfig.GrpcHandler>) {
    this.logger = logger;
    this.config = config;
    this.baseDir = baseDir;
    this.rootJsonAndDecodedDescriptorSet = store.proxy('descriptorSet.proto', {
      codify: ({ rootJson, decodedDescriptorSet }) =>
        `
const { FileDescriptorSet } = require('protobufjs/ext/descriptor/index.js');

module.exports = {
  decodedDescriptorSet: FileDescriptorSet.fromObject(${JSON.stringify(decodedDescriptorSet.toJSON(), null, 2)}),
  rootJson: ${JSON.stringify(rootJson, null, 2)},
};
`.trim(),
      validate: () => {},
    });
  }

  getCachedDescriptorSet(creds: ChannelCredentials) {
    return this.rootJsonAndDecodedDescriptorSet.getWithSet(async () => {
      this.logger.debug(() => `Building Root`);
      const root = new Root();
      const appendRoot = (additionalRoot: protobufjs.Root) => {
        if (additionalRoot.nested) {
          for (const namespace in additionalRoot.nested) {
            if (Object.prototype.hasOwnProperty.call(additionalRoot.nested, namespace)) {
              root.add(additionalRoot.nested[namespace]);
            }
          }
        }
      };
      if (this.config.useReflection) {
        this.logger.debug(() => `Using the reflection`);
        const grpcReflectionServer = this.config.endpoint;
        this.logger.debug(() => `Creating gRPC Reflection Client`);
        const reflectionClient = new grpcReflection.Client(grpcReflectionServer, creds);
        await reflectionClient.listServices().then(services =>
          Promise.all(
            services.map(async (service: string | void) => {
              if (service && !service.startsWith('grpc.')) {
                const serviceRoot = await reflectionClient.fileContainingSymbol(service);
                this.logger.debug(() => `Adding services to the root from the reflection response`);
                appendRoot(serviceRoot);
              }
              return null;
            })
          )
        );
      }
      if (this.config.descriptorSetFilePath) {
        let fileName: string;
        let options: LoadOptions;
        if (typeof this.config.descriptorSetFilePath === 'object') {
          fileName = this.config.descriptorSetFilePath.file;
          options = {
            ...this.config.descriptorSetFilePath.load,
            includeDirs: this.config.descriptorSetFilePath.load.includeDirs?.map(includeDir =>
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
          fileName = this.config.descriptorSetFilePath;
        }
        const absoluteFilePath = isAbsolute(fileName) ? fileName : join(this.baseDir, fileName);
        this.logger.debug(() => `Using the descriptor set from ${absoluteFilePath}`);
        const descriptorSetBuffer = await readFile(absoluteFilePath);
        this.logger.debug(() => `Reading ${absoluteFilePath}`);
        let decodedDescriptorSet: DecodedDescriptorSet;
        if (absoluteFilePath.endsWith('json')) {
          this.logger.debug(() => `Parsing ${absoluteFilePath} as json`);
          const descriptorSetJSON = JSON.parse(descriptorSetBuffer.toString());
          decodedDescriptorSet = descriptor.FileDescriptorSet.fromObject(descriptorSetJSON) as DecodedDescriptorSet;
        } else {
          decodedDescriptorSet = descriptor.FileDescriptorSet.decode(descriptorSetBuffer) as DecodedDescriptorSet;
        }
        this.logger.debug(() => `Creating root from descriptor set`);
        const rootFromDescriptor = (Root as RootConstructor).fromDescriptor(decodedDescriptorSet);
        appendRoot(rootFromDescriptor);
      }

      if (this.config.protoFilePath) {
        this.logger.debug(() => `Using proto file(s)`);
        let protoRoot = new Root();
        let fileGlob: string;
        let options: LoadOptions = {};
        if (typeof this.config.protoFilePath === 'object') {
          fileGlob = this.config.protoFilePath.file;
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
            addIncludePathResolver(protoRoot, options.includeDirs);
          }
        } else {
          fileGlob = this.config.protoFilePath;
        }

        const fileNames = await globby(fileGlob, {
          cwd: this.baseDir,
        });
        this.logger.debug(() => `Loading proto files(${fileGlob}); \n ${fileNames.join('\n')}`);
        protoRoot = await protoRoot.load(
          fileNames.map(filePath => (isAbsolute(filePath) ? filePath : join(this.baseDir, filePath))),
          options
        );
        this.logger.debug(() => `Adding proto content to the root`);
        appendRoot(protoRoot);
      }

      this.logger.debug(() => `Resolving entire the root tree`);
      root.resolveAll();

      this.logger.debug(() => `Creating artifacts from descriptor set and root`);
      return {
        rootJson: root.toJSON({
          keepComments: true,
        }),
        decodedDescriptorSet: root.toDescriptor('proto3'),
      };
    });
  }

  async getMeshSource() {
    let creds: ChannelCredentials;
    if (this.config.credentialsSsl) {
      this.logger.debug(() => `Using SSL Connection`);
      const absolutePrivateKeyPath = isAbsolute(this.config.credentialsSsl.privateKey)
        ? this.config.credentialsSsl.privateKey
        : join(this.baseDir, this.config.credentialsSsl.privateKey);
      const absoluteCertChainPath = isAbsolute(this.config.credentialsSsl.certChain)
        ? this.config.credentialsSsl.certChain
        : join(this.baseDir, this.config.credentialsSsl.certChain);

      const sslFiles = [readFile(absolutePrivateKeyPath), readFile(absoluteCertChainPath)];
      if (this.config.credentialsSsl.rootCA !== 'rootCA') {
        const absoluteRootCAPath = isAbsolute(this.config.credentialsSsl.rootCA)
          ? this.config.credentialsSsl.rootCA
          : join(this.baseDir, this.config.credentialsSsl.rootCA);
        sslFiles.unshift(readFile(absoluteRootCAPath));
      }
      const [rootCA, privateKey, certChain] = await Promise.all(sslFiles);
      creds = credentials.createSsl(rootCA, privateKey, certChain);
    } else if (this.config.useHTTPS) {
      creds = credentials.createSsl();
    } else {
      this.logger.debug(() => `Using insecure connection`);
      creds = credentials.createInsecure();
    }

    this.config.requestTimeout = this.config.requestTimeout || 200000;

    const schemaComposer = new SchemaComposer();
    schemaComposer.add(GraphQLBigInt);
    schemaComposer.add(GraphQLByte);
    schemaComposer.add(GraphQLUnsignedInt);
    schemaComposer.add(GraphQLVoid);
    schemaComposer.add(GraphQLJSON);
    // identical of grpc's ConnectivityState
    schemaComposer.createEnumTC({
      name: 'ConnectivityState',
      values: {
        IDLE: { value: 0 },
        CONNECTING: { value: 1 },
        READY: { value: 2 },
        TRANSIENT_FAILURE: { value: 3 },
        SHUTDOWN: { value: 4 },
      },
    });

    this.logger.debug(() => `Getting stored root and decoded descriptor set objects`);
    const { rootJson, decodedDescriptorSet } = await this.getCachedDescriptorSet(creds);

    const packageDefinition = loadFileDescriptorSetFromObject(decodedDescriptorSet);

    this.logger.debug(() => `Creating package definitions`);
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
      this.logger.debug(() => `Visiting ${currentPath}`);
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
          description: (nested as any).comment,
        };
        const commentMap = (nested as any).comments;
        for (const [key, value] of Object.entries(nested.values)) {
          enumTypeConfig.values[key] = {
            value,
            description: commentMap?.[key],
          };
        }
        schemaComposer.createEnumTC(enumTypeConfig);
      } else if ('fields' in nested) {
        const inputTypeName = typeName + '_Input';
        const outputTypeName = typeName;
        const description = (nested as any).comment;
        const fieldEntries = Object.entries(nested.fields);
        if (fieldEntries.length) {
          const inputTC = schemaComposer.createInputTC({
            name: inputTypeName,
            description,
            fields: {},
          });
          const outputTC = schemaComposer.createObjectTC({
            name: outputTypeName,
            description,
            fields: {},
          });
          await Promise.all(
            fieldEntries.map(async ([fieldName, { type, rule, comment }]: any[]) => {
              const baseFieldTypePath = type.split('.');
              inputTC.addFields({
                [fieldName]: {
                  type: () => {
                    const fieldTypePath = walkToFindTypePath(pathWithName, baseFieldTypePath);
                    const fieldInputTypeName = getTypeName(schemaComposer, fieldTypePath, true);
                    return rule === 'repeated' ? `[${fieldInputTypeName}]` : fieldInputTypeName;
                  },
                  description: comment,
                },
              });
              outputTC.addFields({
                [fieldName]: {
                  type: () => {
                    const fieldTypePath = walkToFindTypePath(pathWithName, baseFieldTypePath);
                    const fieldTypeName = getTypeName(schemaComposer, fieldTypePath, false);
                    return rule === 'repeated' ? `[${fieldTypeName}]` : fieldTypeName;
                  },
                  description: comment,
                },
              });
            })
          );
        } else {
          schemaComposer.createScalarTC({
            ...GraphQLJSON.toConfig(),
            name: inputTypeName,
            description,
          });
          schemaComposer.createScalarTC({
            ...GraphQLJSON.toConfig(),
            name: outputTypeName,
            description,
          });
        }
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
            const fieldConfig: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any> = {
              type: () => {
                const baseResponseTypePath = method.responseType?.split('.');
                if (baseResponseTypePath) {
                  const responseTypePath = walkToFindTypePath(pathWithName, baseResponseTypePath);
                  return getTypeName(schemaComposer, responseTypePath, false);
                }
                return 'Void';
              },
              description: method.comment,
            };
            fieldConfig.args = {
              input: () => {
                const baseRequestTypePath = method.requestType?.split('.');
                if (baseRequestTypePath) {
                  const requestTypePath = walkToFindTypePath(pathWithName, baseRequestTypePath);
                  const requestTypeName = getTypeName(schemaComposer, requestTypePath, true);
                  return requestTypeName;
                }
                return undefined;
              },
            };
            if (method.responseStream) {
              const clientMethod: ClientMethod = (input: unknown = {}, metaData: Metadata) => {
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
              const methodNameLowerCased = methodName.toLowerCase();
              const rootTypeComposer = QUERY_METHOD_PREFIXES.some(prefix => methodNameLowerCased.startsWith(prefix))
                ? schemaComposer.Query
                : schemaComposer.Mutation;
              rootTypeComposer.addFields({
                [rootFieldName]: {
                  ...fieldConfig,
                  resolve: (_, args: Record<string, unknown>, context: Record<string, unknown>) =>
                    addMetaDataToCall(clientMethod, args.input, context, this.config.metaData),
                },
              });
            }
          })
        );
        const connectivityStateFieldName = pathWithName.join('_') + '_connectivityState';
        schemaComposer.Query.addFields({
          [connectivityStateFieldName]: {
            type: 'ConnectivityState',
            args: {
              tryToConnect: {
                type: 'Boolean',
              },
            },
            resolve: (_, { tryToConnect }) => client.getChannel().getConnectivityState(tryToConnect),
          },
        });
      }
    };
    this.logger.debug(() => `Building the schema structure based on the root object`);
    await visit(rootJson, '', []);

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    this.logger.debug(() => `Building the final GraphQL Schema`);
    const schema = schemaComposer.buildSchema();

    return {
      schema,
    };
  }
}
