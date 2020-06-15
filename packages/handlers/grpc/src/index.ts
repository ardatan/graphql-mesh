import { MeshHandlerLibrary, YamlConfig, KeyValueCache } from '@graphql-mesh/types';
import { pathExistsSync } from 'fs-extra';
import { GraphQLEnumTypeConfig } from 'graphql';
import { GraphQLBigInt } from 'graphql-scalars';
import { AnyNestedObject, Root, IParseOptions } from 'protobufjs';
import { isAbsolute, join } from 'path';
import { camelCase } from 'camel-case';
import { pascalCase } from 'pascal-case';
import { SchemaComposer } from 'graphql-compose';
import { ArgsMap } from 'graphql-compose/lib/ObjectTypeComposer';
import { withCancel, readFileOrUrlWithCache } from '@graphql-mesh/utils';
import {
  ChannelCredentials,
  ClientReadableStream,
  ClientUnaryCall,
  Metadata,
  MetadataValue,
  credentials,
  loadPackageDefinition,
} from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';
import { get } from 'lodash';
import { Readable } from 'stream';
import { promisify } from 'util';

const SCALARS = {
  int32: 'Int',
  int64: 'BigInt',
  float: 'Float',
  double: 'Float',
  string: 'String',
  bool: 'Boolean',
};

interface LoadOptions extends IParseOptions {
  includeDirs?: string[];
}

interface GrpcResponseStream<T = ClientReadableStream<unknown>> extends Readable {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
  cancel(): void;
}

type ClientMethod = (
  input: unknown,
  metaData?: Metadata
) => Promise<ClientUnaryCall> | AsyncIterator<ClientReadableStream<unknown>>;

function addIncludePathResolver(root: Root, includePaths: string[]) {
  const originalResolvePath = root.resolvePath;
  root.resolvePath = (origin: string, target: string) => {
    if (isAbsolute(target)) {
      return target;
    }
    for (const directory of includePaths) {
      const fullPath: string = join(directory, target);
      if (pathExistsSync(fullPath)) {
        return fullPath;
      }
    }
    const path = originalResolvePath(origin, target);
    if (path === null) {
      console.warn(`${target} not found in any of the include paths ${includePaths}`);
    }
    return path;
  };
}

function addMetaDataToCall(
  call: ClientMethod,
  input: unknown,
  context: Record<string, unknown>,
  metaData: Record<string, string | ArrayBuffer>
) {
  const meta = new Metadata();
  if (metaData) {
    for (const [key, value] of Object.entries(metaData)) {
      let metaValue: unknown = value;
      if (Array.isArray(value)) {
        // Extract data from context
        metaValue = get(context, value);
      }
      // Ensure that the metadata is compatible with what node-grpc expects
      if (typeof metaValue !== 'string') {
        if ((metaValue as ArrayBuffer).slice && (metaValue as ArrayBuffer).byteLength >= 0 && key.endsWith('-bin')) {
          // Doesn't look like an TypedArray
          throw new Error(`MetaData key '${key}' is a Buffer, but does not end with '-bin'`);
        } else {
          throw new Error(`MetaData key '${key}' has a non string`);
        }
      }

      meta.add(key, metaValue as MetadataValue);
    }

    return call(input, meta);
  }
  return call(input);
}

async function getBuffer(path: string, cache: KeyValueCache) {
  if (path) {
    const result = await readFileOrUrlWithCache<string>(path, cache, {
      allowUnknownExtensions: true,
    });
    return Buffer.from(result);
  }
  return undefined;
}

const handler: MeshHandlerLibrary<YamlConfig.GrpcHandler> = {
  async getMeshSource({ config, cache }) {
    if (!config) {
      throw new Error('Config not specified!');
    }

    let creds: ChannelCredentials;
    if (config.credentialsSsl) {
      const [rootCA, privateKey, certChain] = await Promise.all([
        getBuffer(config.credentialsSsl.rootCA, cache),
        getBuffer(config.credentialsSsl.privateKey, cache),
        getBuffer(config.credentialsSsl.certChain, cache),
      ]);
      creds = credentials.createSsl(rootCA, privateKey, certChain);
    } else {
      creds = credentials.createInsecure();
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
      if (isInput && !schemaComposer.isEnumType(baseTypeName)) {
        baseTypeName += 'Input';
      }
      return baseTypeName;
    }

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
            value,
          };
        }
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
        await Promise.all(
          Object.keys(nested.fields).map(async fieldName => {
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
          })
        );
      } else if ('methods' in nested) {
        const objPath = currentPath + '.' + name;
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
      } else if ('nested' in nested) {
        await Promise.all(
          Object.keys(nested.nested).map(async (key: string) => {
            const currentNested = nested.nested[key];
            await visit(currentNested, key, currentPath ? currentPath + '.' + name : name);
          })
        );
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
