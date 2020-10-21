import { GetMeshSourceOptions, KeyValueCache, MeshHandler, YamlConfig } from '@graphql-mesh/types';
import { withCancel } from '@graphql-mesh/utils';
import * as grpc from 'grpc';
import { createPackageDefinition, load } from '@grpc/proto-loader';
import { camelCase } from 'camel-case';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLBigInt, GraphQLByte, GraphQLUnsignedInt } from 'graphql-scalars';
import { get } from 'lodash';
import { pascalCase } from 'pascal-case';
import { AnyNestedObject, IParseOptions, Root } from 'protobufjs';
import { Readable } from 'stream';
import { promisify } from 'util';
import grpcReflection from 'grpc-reflection-js';

import {
  ClientMethod,
  addIncludePathResolver,
  addMetaDataToCall,
  createEnum,
  createInputOutput,
  getBuffer,
  getTypeName,
} from './utils';

interface LoadOptions extends IParseOptions {
  includeDirs?: string[];
}

interface GrpcResponseStream<T = grpc.ClientReadableStream<unknown>> extends Readable {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
  cancel(): void;
}

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private cache: KeyValueCache;
  constructor({ config, cache }: GetMeshSourceOptions<YamlConfig.GrpcHandler>) {
    if (!config) {
      throw new Error('Config not specified!');
    }
    this.config = config;
    this.cache = cache;
  }

  async getMeshSource() {
    let creds: grpc.ChannelCredentials;
    if (this.config.credentialsSsl) {
      const sslFiles = [
        getBuffer(this.config.credentialsSsl.privateKey, this.cache),
        getBuffer(this.config.credentialsSsl.certChain, this.cache),
      ];
      if (this.config.credentialsSsl.rootCA !== 'rootCA') {
        sslFiles.unshift(getBuffer(this.config.credentialsSsl.rootCA, this.cache));
      }
      const [rootCA, privateKey, certChain] = await Promise.all(sslFiles);
      creds = grpc.credentials.createSsl(rootCA, privateKey, certChain);
    } else if (this.config.useHTTPS) {
      creds = grpc.credentials.createSsl();
    } else {
      creds = grpc.credentials.createInsecure();
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
    let packageDefinition: grpc.PackageDefinition;
    if (this.config.useReflection) {
      const grpcReflectionServer = this.config.endpoint;
      const reflectionClient = new grpcReflection.Client(grpcReflectionServer, creds);
      const services = (await reflectionClient.listServices()) as string[];
      const serviceRoots = await Promise.all(
        services.map((service: string) => reflectionClient.fileContainingSymbol(service))
      );
      serviceRoots.forEach((serviceRoot: Root) => {
        serviceRoot.name = this.config.serviceName || '';
        root.add(serviceRoot);
      });
      packageDefinition = createPackageDefinition(root);
    } else {
      let fileName = this.config.protoFilePath;
      let options: LoadOptions = {};
      if (typeof this.config.protoFilePath === 'object' && this.config.protoFilePath.file) {
        fileName = this.config.protoFilePath.file;
        options = this.config.protoFilePath.load;
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
    const grpcObject = grpc.loadPackageDefinition(packageDefinition);

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
            if (this.config.useReflection) {
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
              const clientMethod: ClientMethod = (input: unknown, metaData: grpc.Metadata) => {
                const responseStream = client[methodName](input, metaData) as GrpcResponseStream;
                const test = withCancel(responseStream, () => responseStream.cancel());
                return test;
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
              const clientMethod = promisify<grpc.ClientUnaryCall>(client[methodName].bind(client) as ClientMethod);
              const identifier = methodName.toLowerCase();
              const rootTC = (identifier.startsWith('get') || identifier.startsWith('list')) ? schemaComposer.Query : schemaComposer.Mutation;
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

    const schema = schemaComposer.buildSchema();

    return {
      schema,
    };
  }
}
