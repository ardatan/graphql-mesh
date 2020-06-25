import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { withCancel } from '@graphql-mesh/utils';
import {
  ChannelCredentials,
  ClientReadableStream,
  ClientUnaryCall,
  Metadata,
  credentials,
  loadPackageDefinition,
} from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';
import { camelCase } from 'camel-case';
import { SchemaComposer } from 'graphql-compose';
import { ArgsMap } from 'graphql-compose/lib/ObjectTypeComposer';
import { GraphQLBigInt, GraphQLByte, GraphQLUnsignedInt } from 'graphql-scalars';
import { get } from 'lodash';
import { pascalCase } from 'pascal-case';
import { AnyNestedObject, IParseOptions, Root } from 'protobufjs';
import { Readable } from 'stream';
import { promisify } from 'util';

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

interface GrpcResponseStream<T = ClientReadableStream<unknown>> extends Readable {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
  cancel(): void;
}

const handler: MeshHandlerLibrary<YamlConfig.GrpcHandler> = {
  async getMeshSource({ config, cache }) {
    if (!config) {
      throw new Error('Config not specified!');
    }

    let creds: ChannelCredentials;
    if (config.credentialsSsl) {
      const sslFiles = [
        getBuffer(config.credentialsSsl.privateKey, cache),
        getBuffer(config.credentialsSsl.certChain, cache),
      ];
      if (config.credentialsSsl.rootCA !== 'rootCA') {
        sslFiles.unshift(getBuffer(config.credentialsSsl.rootCA, cache));
      }
      const [rootCA, privateKey, certChain] = await Promise.all(sslFiles);
      creds = credentials.createSsl(rootCA, privateKey, certChain);
    } else {
      creds = credentials.createInsecure();
    }

    config.requestTimeout = config.requestTimeout || 200000;

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
    let fileName = config.protoFilePath;
    let options: LoadOptions = {};
    if (typeof config.protoFilePath === 'object' && config.protoFilePath.file) {
      fileName = config.protoFilePath.file;
      options = config.protoFilePath.load;
      if (options.includeDirs) {
        if (!Array.isArray(options.includeDirs)) {
          return Promise.reject(new Error('The includeDirs option must be an array'));
        }
        addIncludePathResolver(root, options.includeDirs);
      }
    }
    const protoDefinition = await root.load(fileName as string, options);
    protoDefinition.resolveAll();
    const packageDefinition = await load(fileName as string, options);
    const grpcObject = loadPackageDefinition(packageDefinition);

    async function visit(nested: AnyNestedObject, name: string, currentPath: string) {
      if ('nested' in nested) {
        await Promise.all(
          Object.keys(nested.nested).map(async (key: string) => {
            const currentNested = nested.nested[key];
            await visit(currentNested, key, currentPath ? currentPath + '.' + name : name);
          })
        );
      }
      if ('values' in nested) {
        if (config.packageName && currentPath && !currentPath.includes(config.packageName)) {
          // outside value that needs to be scoped by package name to ensure there are no clashes
          const typeName = pascalCase(currentPath.split('.').join('_') + '_' + name);
          schemaComposer.createEnumTC(createEnum(typeName, nested.values));
        } else {
          const typeName = pascalCase(name);
          if (currentPath && currentPath !== config.packageName) {
            // this is a nested value, add both nested name and unnested name
            const nestedName = config.packageName ? currentPath.split(config.packageName)[1] : currentPath;
            const typeName = pascalCase(nestedName.split('.').join('_') + '_' + name);
            schemaComposer.createEnumTC(createEnum(typeName, nested.values));
          }
          schemaComposer.createEnumTC(createEnum(typeName, nested.values));
        }
      } else if ('fields' in nested) {
        if (config.packageName && currentPath && !currentPath.includes(config.packageName)) {
          // outside message that needs to be scoped by package name to ensure there are no clashes
          const typeName = pascalCase(currentPath.split('.').join('_') + '_' + name);
          createInputOutput(schemaComposer, typeName, currentPath, config.packageName, nested.fields);
        } else {
          const typeName = pascalCase(name);
          if (currentPath && currentPath !== config.packageName) {
            // this is a nested message, add both nested name and unnested name
            const nestedName = config.packageName ? currentPath.split(config.packageName)[1] : currentPath;
            const typeName = pascalCase(nestedName.split('.').join('_') + '_' + name);
            createInputOutput(schemaComposer, typeName, currentPath, config.packageName, nested.fields);
          }
          createInputOutput(schemaComposer, typeName, currentPath, config.packageName, nested.fields);
        }
      } else if ('methods' in nested) {
        const objPath = currentPath ? currentPath + '.' + name : name;
        const ServiceClient = get(grpcObject, objPath);
        if (typeof ServiceClient !== 'function') {
          throw new Error(`Object at path ${objPath} is not a Service constructor`);
        }
        const client = new ServiceClient(config.endpoint, creds);
        const methods = nested.methods;
        await Promise.all(
          Object.keys(methods).map(async (methodName: string) => {
            const method = methods[methodName];
            let rootFieldName = methodName;
            let responseType = method.responseType;
            let requestType = method.requestType;
            if (name !== config.serviceName) {
              rootFieldName = camelCase(name + '_' + rootFieldName);
            }
            if (currentPath !== config.packageName) {
              rootFieldName = camelCase(currentPath.split('.').join('_') + '_' + rootFieldName);
              responseType = camelCase(currentPath.split('.').join('_') + '_' + responseType);
              requestType = camelCase(currentPath.split('.').join('_') + '_' + requestType);
            }
            const fieldConfig = {
              type: () => getTypeName(schemaComposer, responseType, false, config.packageName),
              args: {
                input: {
                  type: () => getTypeName(schemaComposer, requestType, true, config.packageName),
                  defaultValue: {},
                },
              },
            };
            if (method.responseStream) {
              const clientMethod: ClientMethod = (input: unknown, metaData: Metadata) => {
                const responseStream = client[methodName](input, metaData) as GrpcResponseStream;
                const test = withCancel(responseStream, () => responseStream.cancel());
                return test;
              };
              schemaComposer.Subscription.addFields({
                [rootFieldName]: {
                  ...fieldConfig,
                  subscribe: (__, args: ArgsMap, context: Record<string, unknown>) =>
                    addMetaDataToCall(clientMethod, args.input, context, config.metaData),
                  resolve: (payload: unknown) => payload,
                },
              });
            } else {
              const clientMethod = promisify<ClientUnaryCall>(client[methodName].bind(client) as ClientMethod);
              const identifier = methodName.toLowerCase();
              const rootTC = identifier.startsWith('get') ? schemaComposer.Query : schemaComposer.Mutation;
              rootTC.addFields({
                [rootFieldName]: {
                  ...fieldConfig,
                  resolve: (_, args: ArgsMap, context: Record<string, unknown>) =>
                    addMetaDataToCall(clientMethod, args.input, context, config.metaData),
                },
              });
            }
          })
        );
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
      }
    }
    const rootNested = root.toJSON({
      keepComments: true,
    });
    await visit(rootNested, '', '');

    const schema = schemaComposer.buildSchema();

    return {
      schema,
    };
  },
};

export default handler;
