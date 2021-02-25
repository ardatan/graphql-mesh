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
import {
  PackageDefinition,
  load,
  loadFileDescriptorSetFromBuffer,
  loadFileDescriptorSetFromObject,
} from '@grpc/proto-loader';
import { camelCase } from 'camel-case';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLBigInt, GraphQLByte, GraphQLUnsignedInt } from 'graphql-scalars';
import { get } from 'lodash';
import { pascalCase } from 'pascal-case';
import { AnyNestedObject, IParseOptions, Message, Root, RootConstructor } from 'protobufjs';
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

interface LoadOptions extends IParseOptions {
  includeDirs?: string[];
}

type DecodedDescriptorSet = Message<IFileDescriptorSet> & IFileDescriptorSet;

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private baseDir: string;
  private cache: KeyValueCache;

  constructor({ config, baseDir, cache }: GetMeshSourceOptions<YamlConfig.GrpcHandler>) {
    if (!config) {
      throw new Error('Config not specified!');
    }
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
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
          descripton: 'status string',
        },
      },
    });

    const root = new Root();
    let packageDefinition: PackageDefinition;
    if (this.config.useReflection) {
      const grpcReflectionServer = this.config.endpoint;
      const reflectionClient = new grpcReflection.Client(grpcReflectionServer, creds as any);
      const services = (await reflectionClient.listServices()) as string[];
      const serviceRoots = await Promise.all(
        services
          .filter(s => s && s !== 'grpc.reflection.v1alpha.ServerReflection')
          .map((service: string) => reflectionClient.fileContainingSymbol(service))
      );
      serviceRoots.forEach((serviceRoot: Root) => {
        if (serviceRoot.nested) {
          for (const namespace in serviceRoot.nested) {
            if (Object.prototype.hasOwnProperty.call(serviceRoot.nested, namespace)) {
              root.add(serviceRoot.nested[namespace]);
            }
          }
        }
      });
      root.resolveAll();
      const descriptorSet = root.toDescriptor('proto3');
      packageDefinition = loadFileDescriptorSetFromObject(descriptorSet.toJSON());
    } else if (this.config.descriptorSetFilePath) {
      // We have to use an ol' fashioned require here :(
      // Needed for descriptor.FileDescriptorSet
      const descriptor = require('protobufjs/ext/descriptor');

      let fileName = this.config.descriptorSetFilePath;
      let options: LoadOptions = {};
      if (typeof this.config.descriptorSetFilePath === 'object' && this.config.descriptorSetFilePath.file) {
        fileName = this.config.descriptorSetFilePath.file;
        options = this.config.descriptorSetFilePath.load;
      }
      const descriptorSetBuffer = await getBuffer(fileName as string, this.cache, this.baseDir);
      let decodedDescriptorSet: DecodedDescriptorSet;
      try {
        const descriptorSetJSON = JSON.parse(descriptorSetBuffer.toString());
        decodedDescriptorSet = descriptor.FileDescriptorSet.fromObject(descriptorSetJSON) as DecodedDescriptorSet;
        packageDefinition = await loadFileDescriptorSetFromObject(descriptorSetJSON, options);
      } catch (e) {
        decodedDescriptorSet = descriptor.FileDescriptorSet.decode(descriptorSetBuffer) as DecodedDescriptorSet;
        packageDefinition = await loadFileDescriptorSetFromBuffer(descriptorSetBuffer, options);
      }
      const descriptorSetRoot = (Root as RootConstructor).fromDescriptor(decodedDescriptorSet);
      root.add(descriptorSetRoot);
    } else {
      let fileName = this.config.protoFilePath;
      let options: LoadOptions = {};
      if (typeof this.config.protoFilePath === 'object' && this.config.protoFilePath.file) {
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
      }

      const protoDefinition = await root.load(fileName as string, options);
      protoDefinition.resolveAll();

      packageDefinition = await load(fileName as string, options);
    }
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
    const rootNested = root.toJSON({
      keepComments: true,
    });
    await visit(rootNested, '', '');

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => schemaComposer.addDirective(directive));

    const schema = schemaComposer.buildSchema();

    return {
      schema,
    };
  }
}
