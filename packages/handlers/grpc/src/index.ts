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
import { camelCase } from 'camel-case';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLBigInt, GraphQLByte, GraphQLUnsignedInt } from 'graphql-scalars';
import { get } from 'lodash';
import { pascalCase } from 'pascal-case';
import { AnyNestedObject, INamespace, IParseOptions, Message, Root, RootConstructor } from 'protobufjs';
import { promisify } from 'util';
import grpcReflection from 'grpc-reflection-js';
import { IFileDescriptorSet } from 'protobufjs/ext/descriptor';

import {
  ClientMethod,
  addIncludePathResolver,
  addMetaDataToCall,
  createEnum,
  createInputOutput,
  getBuffer,
  getTypeName,
} from './utils';
import { specifiedDirectives } from 'graphql';
import { join, isAbsolute } from 'path';

// We have to use an ol' fashioned require here :(
// Needed for descriptor.FileDescriptorSet
const descriptor = require('protobufjs/ext/descriptor');

interface LoadOptions extends IParseOptions {
  includeDirs?: string[];
}

type DecodedDescriptorSet = Message<IFileDescriptorSet> & IFileDescriptorSet;

interface GrpcHandlerIntrospectionCache {
  rootJson: INamespace;
  descriptorSetJson: any;
}

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private baseDir: string;
  private cache: KeyValueCache;
  private introspectionCache: GrpcHandlerIntrospectionCache;

  constructor({
    config,
    baseDir,
    cache,
    introspectionCache,
  }: GetMeshSourceOptions<YamlConfig.GrpcHandler, GrpcHandlerIntrospectionCache>) {
    if (!config) {
      throw new Error('Config not specified!');
    }
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.introspectionCache = introspectionCache || {
      rootJson: null,
      descriptorSetJson: null,
    };
  }

  async getCachedRootJson(creds: ChannelCredentials) {
    if (!this.introspectionCache.rootJson || !this.introspectionCache.descriptorSetJson) {
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
              isAbsolute(includeDir) ? includeDir : join(this.baseDir || process.cwd(), includeDir)
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
      this.introspectionCache.rootJson = root.toJSON({
        keepComments: true,
      });
      this.introspectionCache.descriptorSetJson = root.toDescriptor('proto3').toJSON();
    }

    return this.introspectionCache;
  }

  async getMeshSource() {
    this.config.packageName = this.config.packageName || '';
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

    const { rootJson, descriptorSetJson } = await this.getCachedRootJson(creds);
    const decodedDescriptorSet = await descriptor.FileDescriptorSet.fromObject(descriptorSetJson);
    const packageDefinition = loadFileDescriptorSetFromObject(decodedDescriptorSet);

    const grpcObject = loadPackageDefinition(packageDefinition);

    const visit = async (nested: AnyNestedObject, name: string, currentPath: string) => {
      if ('nested' in nested) {
        await Promise.all(
          Object.keys(nested.nested).map(async (key: string) => {
            const currentNested = nested.nested[key];
            await visit(currentNested, key, currentPath ? currentPath + '.' + name : name);
          })
        );
      }
      if ('values' in nested) {
        if (this.config.packageName && currentPath && !currentPath.includes(this.config.packageName)) {
          // outside value that needs to be scoped by package name to ensure there are no clashes
          const typeName = pascalCase(currentPath.split('.').join('_') + '_' + name);
          schemaComposer.createEnumTC(createEnum(typeName, nested.values));
        } else {
          const typeName = pascalCase(name);
          if (currentPath && currentPath !== this.config.packageName) {
            // this is a nested value, add both nested name and unnested name
            const nestedName = this.config.packageName ? currentPath.split(this.config.packageName)[1] : currentPath;
            const typeName = pascalCase(nestedName.split('.').join('_') + '_' + name);
            schemaComposer.createEnumTC(createEnum(typeName, nested.values));
          }
          schemaComposer.createEnumTC(createEnum(typeName, nested.values));
        }
      } else if ('fields' in nested) {
        if (this.config.packageName && currentPath && !currentPath.includes(this.config.packageName)) {
          // outside message that needs to be scoped by package name to ensure there are no clashes
          const typeName = pascalCase(currentPath.split('.').join('_') + '_' + name);
          createInputOutput(schemaComposer, typeName, currentPath, this.config.packageName, nested.fields);
        } else {
          const typeName = pascalCase(name);
          if (currentPath && currentPath !== this.config.packageName) {
            // this is a nested message, add both nested name and unnested name
            const nestedName = this.config.packageName ? currentPath.split(this.config.packageName)[1] : currentPath;
            const typeName = pascalCase(nestedName.split('.').join('_') + '_' + name);
            createInputOutput(schemaComposer, typeName, currentPath, this.config.packageName, nested.fields);
          }
          createInputOutput(schemaComposer, typeName, currentPath, this.config.packageName, nested.fields);
        }
      } else if ('methods' in nested) {
        const objPath = currentPath ? currentPath + '.' + name : name;
        const ServiceClient = get(grpcObject, objPath);
        if (typeof ServiceClient !== 'function') {
          throw new Error(`Object at path ${objPath} is not a Service constructor`);
        }
        const client = new ServiceClient(this.config.endpoint, creds);
        const methods = nested.methods;
        await Promise.all(
          Object.keys(methods).map(async (methodName: string) => {
            const method = methods[methodName];
            let rootFieldName = methodName;
            let responseType = method.responseType;
            let requestType = method.requestType;
            if (name !== this.config.serviceName) {
              rootFieldName = camelCase(name + '_' + rootFieldName);
            }
            if (!this.config.serviceName && this.config.useReflection) {
              rootFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootFieldName);
              responseType = camelCase(currentPath.split('.').join('_') + '_' + responseType.replace(currentPath, ''));
              requestType = camelCase(currentPath.split('.').join('_') + '_' + requestType.replace(currentPath, ''));
            } else if (this.config.descriptorSetFilePath && currentPath !== this.config.packageName) {
              const reflectionPath = currentPath.replace(this.config.serviceName || '', '');
              rootFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootFieldName);
              responseType = camelCase(
                currentPath.split('.').join('_') + '_' + responseType.replace(reflectionPath, '')
              );
              requestType = camelCase(currentPath.split('.').join('_') + '_' + requestType.replace(reflectionPath, ''));
            } else if (currentPath !== this.config.packageName) {
              rootFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootFieldName);
              responseType = camelCase(currentPath.split('.').join('_') + '_' + responseType);
              requestType = camelCase(currentPath.split('.').join('_') + '_' + requestType);
            }
            const fieldConfig = {
              type: () => getTypeName(schemaComposer, responseType, false, this.config.packageName),
              args: {
                input: {
                  type: () => getTypeName(schemaComposer, requestType, true, this.config.packageName),
                  defaultValue: {},
                },
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
        let rootPingFieldName = 'ping';
        if (name !== this.config.serviceName) {
          rootPingFieldName = camelCase(name + '_' + rootPingFieldName);
        }
        if (currentPath !== this.config.packageName) {
          rootPingFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootPingFieldName);
        }
        schemaComposer.Query.addFields({
          [rootPingFieldName]: {
            type: 'ServerStatus',
            resolve: () => ({ status: 'online' }),
          },
        });
      }
    };
    await visit(rootJson, '', '');

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const schema = schemaComposer.buildSchema();

    return {
      schema,
    };
  }
}
