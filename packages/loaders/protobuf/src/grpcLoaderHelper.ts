import { specifiedDirectives } from 'graphql';
import {
  SchemaComposer,
  type EnumTypeComposerValueConfigDefinition,
  type ObjectTypeComposer,
  type ObjectTypeComposerFieldConfigAsObjectDefinition,
} from 'graphql-compose';
import {
  GraphQLBigInt,
  GraphQLByte,
  GraphQLJSON,
  GraphQLUnsignedInt,
  GraphQLVoid,
} from 'graphql-scalars';
import micromatch from 'micromatch';
import protobufjs, { type AnyNestedObject, type IParseOptions, type Message } from 'protobufjs';
import descriptor, { type IFileDescriptorSet } from 'protobufjs/ext/descriptor.js';
import { Client } from '@ardatan/grpc-reflection-js';
import { type Logger } from '@graphql-hive/logger';
import { fs, path } from '@graphql-mesh/cross-helpers';
import { ensureFederationReadySubgraph } from '@graphql-mesh/fusion-composition';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { YamlConfig } from '@graphql-mesh/types';
import { matchFiles } from '@graphql-tools/load-files';
import { GraphQLStreamDirective, type Constructor } from '@graphql-tools/utils';
import {
  credentials,
  Client as GrpcClient,
  Metadata,
  type ChannelCredentials,
} from '@grpc/grpc-js';
import { DisposableStack } from '@whatwg-node/disposablestack';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { protobufRpcDirective, transportDirective } from './directives.js';
import { emitRequestBody, emitResponseSelection } from './emitMapping.js';
import { addIncludePathResolver, getTypeName, walkToFindTypePath } from './utils.js';

const { Root } = protobufjs;

/**
 * Mesh protobuf RPC supports proto3 only. Proto2 optional/defaults would need explicit
 * presence + declared defaults in the mapping codec; reject rather than decode incorrectly.
 * protobufjs records `_edition: "proto2"` on namespaces/types after resolveAll.
 */
function assertProto3Only(root: protobufjs.Root): void {
  const visit = (ns: protobufjs.NamespaceBase): void => {
    for (const nested of ns.nestedArray) {
      // Package/root namespaces keep the protobufjs default edition; only message types
      // reflect the file's declared syntax after resolveAll.
      if (nested instanceof protobufjs.Type) {
        const edition = (nested as { _edition?: string })._edition;
        if (edition === 'proto2') {
          throw new Error(
            `Protobuf loader supports proto3 only; ${nested.fullName || nested.name} is proto2`,
          );
        }
        for (const field of nested.fieldsArray) {
          if (field.required) {
            throw new Error(
              `Protobuf loader supports proto3 only; required field ${field.fullName} is proto2`,
            );
          }
          if (field.options && Object.prototype.hasOwnProperty.call(field.options, 'default')) {
            throw new Error(
              `Protobuf loader supports proto3 only; field default on ${field.fullName} is proto2`,
            );
          }
        }
      }
      if (nested instanceof protobufjs.Namespace) {
        visit(nested);
      }
    }
  };
  visit(root);
}

interface LoadOptions extends IParseOptions {
  includeDirs?: string[];
}

type DecodedDescriptorSet = Message<IFileDescriptorSet> & IFileDescriptorSet;

const QUERY_METHOD_PREFIXES = ['get', 'list', 'search'];

export class GrpcLoaderHelper extends DisposableStack {
  private schemaComposer = new SchemaComposer();
  constructor(
    private subgraphName: string,
    private baseDir: string,
    private log: Logger,
    private config: YamlConfig.GrpcHandler,
  ) {
    super();
  }

  async buildSchema() {
    this.schemaComposer.add(GraphQLBigInt);
    this.schemaComposer.add(GraphQLByte);
    this.schemaComposer.add(GraphQLUnsignedInt);
    this.schemaComposer.add(GraphQLVoid);
    this.schemaComposer.add(GraphQLJSON);
    this.schemaComposer.createScalarTC({
      name: 'File',
    });

    this.log.debug(`Getting channel credentials`);
    const creds = await this.getCredentials();
    if ('_unref' in creds && typeof creds._unref === 'function') {
      this.defer(() => (creds as { _unref: () => void })._unref());
    }

    this.log.debug(`Getting stored root and decoded descriptor set objects`);
    const descriptorSets = await this.getDescriptorSets(creds);

    for (const { name: rootJsonName, rootJson } of descriptorSets) {
      const rootLogger = this.log.child({ root: rootJsonName });

      this.log.debug(`Building the schema structure based on the root object`);
      this.visit({
        nested: rootJson,
        name: '',
        currentPath: [],
        rootJsonName,
        rootJson,
        rootLogger,
      });
    }

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => this.schemaComposer.addDirective(directive));

    if (!this.schemaComposer.hasDirective('stream')) {
      this.schemaComposer.addDirective(GraphQLStreamDirective);
    }

    this.log.debug(`Building the final GraphQL Schema`);
    this.schemaComposer.addDirective(transportDirective);
    const schema = this.schemaComposer.buildSchema();
    const schemaExtensions: Record<string, any> = (schema.extensions = schema.extensions || {});
    const directiveExtensions = (schemaExtensions.directives = schemaExtensions.directives || {});
    // Default requestTimeout lives in the transport — only stamp an override when configured.
    const transportOptions: Record<string, unknown> = {};
    if (this.config.requestTimeout != null) {
      transportOptions.requestTimeout = this.config.requestTimeout;
    }
    if (this.config.credentialsSsl) {
      transportOptions.credentialsSsl = this.config.credentialsSsl;
    }
    if (this.config.useHTTPS) {
      transportOptions.useHTTPS = this.config.useHTTPS;
    }
    if (this.config.metaData) {
      transportOptions.metaData = Object.entries(this.config.metaData);
    }
    // Serialize as entries so keys like `grpc.max_receive_message_length` are GraphQL-safe
    if (this.config.channelOptions) {
      transportOptions.channelOptions = Object.entries(this.config.channelOptions);
    }
    directiveExtensions.transport = {
      subgraph: this.subgraphName,
      kind: 'protobuf',
      location: this.config.endpoint,
      ...(Object.keys(transportOptions).length > 0 ? { options: transportOptions } : {}),
    };
    return ensureFederationReadySubgraph(schema);
  }

  private processReflection(creds: ChannelCredentials): Promise<Promise<protobufjs.Root>[]> {
    this.log.debug(`Using the reflection`);
    const reflectionEndpoint = stringInterpolator.parse(this.config.endpoint, {
      env: globalThis.process?.env,
    });
    this.log.debug(`Creating gRPC Reflection Client`);
    const reflectionClient = new Client(reflectionEndpoint, creds, this.config.channelOptions);
    // Attach reflectionMetadata to server-reflection calls (routing / auth metadata)
    if (this.config.reflectionMetadata) {
      const meta = new Metadata();
      const resolverData = { env: globalThis.process?.env };
      for (const [key, value] of Object.entries(this.config.reflectionMetadata)) {
        const interpolated =
          typeof value === 'string' ? stringInterpolator.parse(value, resolverData) : value;
        meta.set(key, String(interpolated));
      }
      const grpcClient = reflectionClient.grpcClient as {
        serverReflectionInfo: (...args: any[]) => any;
      };
      const originalServerReflectionInfo = grpcClient.serverReflectionInfo.bind(grpcClient);
      grpcClient.serverReflectionInfo = (...args: any[]) => {
        args[0] = meta;
        return originalServerReflectionInfo(...args);
      };
    }
    // Avoid Close RPC name collisions if present on generated clients
    this.defer(() => GrpcClient.prototype.close.call(reflectionClient.grpcClient));
    return reflectionClient.listServices().then(services =>
      (services.filter(service => service && !service?.startsWith('grpc.')) as string[]).map(
        service => {
          this.log.debug(`Resolving root of Service: ${service} from the reflection response`);
          return reflectionClient.fileContainingSymbol(service);
        },
      ),
    );
  }

  private async processDescriptorFile() {
    let fileName: string;
    let options: LoadOptions;
    if (typeof this.config.source === 'object') {
      fileName = this.config.source.file;
      options = {
        ...this.config.source.load,
        includeDirs: this.config.source.load.includeDirs?.map(includeDir =>
          path.isAbsolute(includeDir) ? includeDir : path.join(this.baseDir, includeDir),
        ),
      };
    } else {
      fileName = this.config.source;
    }
    fileName = stringInterpolator.parse(fileName, { env: globalThis.process?.env });
    const absoluteFilePath = path.isAbsolute(fileName)
      ? fileName
      : path.join(this.baseDir, fileName);
    this.log.debug(`Using the descriptor set from ${absoluteFilePath} `);
    const descriptorSetBuffer = await fs.promises.readFile(absoluteFilePath);
    this.log.debug(`Reading ${absoluteFilePath} `);
    let decodedDescriptorSet: DecodedDescriptorSet;
    if (absoluteFilePath.endsWith('json')) {
      this.log.debug(`Parsing ${absoluteFilePath} as json`);
      const descriptorSetJSON = JSON.parse(descriptorSetBuffer.toString());
      decodedDescriptorSet = descriptor.FileDescriptorSet.fromObject(
        descriptorSetJSON,
      ) as unknown as DecodedDescriptorSet;
    } else {
      decodedDescriptorSet = descriptor.FileDescriptorSet.decode(
        descriptorSetBuffer,
      ) as unknown as DecodedDescriptorSet;
    }
    this.log.debug(`Creating root from descriptor set`);
    const rootFromDescriptor = (Root as any).fromDescriptor(decodedDescriptorSet);
    if (options.includeDirs) {
      if (!Array.isArray(options.includeDirs)) {
        throw new Error('The includeDirs option must be an array');
      }
      addIncludePathResolver(rootFromDescriptor, options.includeDirs);
    }
    return rootFromDescriptor;
  }

  private async processProtoFile() {
    this.log.debug(`Using proto file(s)`);
    let protoRoot = new Root();
    let fileGlob: string;
    let options: LoadOptions = {
      keepCase: true,
      alternateCommentMode: true,
    };
    if (typeof this.config.source === 'object') {
      fileGlob = this.config.source.file;
      options = {
        ...options,
        ...this.config.source.load,
        includeDirs: this.config.source.load?.includeDirs?.map(includeDir =>
          path.isAbsolute(includeDir) ? includeDir : path.join(this.baseDir, includeDir),
        ),
      };
      if (options.includeDirs) {
        if (!Array.isArray(options.includeDirs)) {
          throw new Error('The includeDirs option must be an array');
        }
        addIncludePathResolver(protoRoot, options.includeDirs);
      }
    } else {
      fileGlob = this.config.source;
    }

    fileGlob = stringInterpolator.parse(fileGlob, { env: globalThis.process?.env });

    const fileNames = await matchFiles(fileGlob, {
      cwd: this.baseDir,
      absolute: false,
    });
    this.log.debug(`Loading proto files(${fileGlob}); \n ${fileNames.join('\n')} `);
    protoRoot = await protoRoot.load(
      fileNames.map(filePath =>
        path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath),
      ),
      options,
    );
    this.log.debug(`Adding proto content to the root`);
    return protoRoot;
  }

  private async getDescriptorSets(creds: ChannelCredentials) {
    const rootPromises: Promise<protobufjs.Root>[] = [];
    this.log.debug(`Building Roots`);
    const filePath = this.config.source
      ? typeof this.config.source === 'string'
        ? this.config.source
        : this.config.source.file
      : undefined;
    // Missing or empty source means gRPC reflection (also accepts source: { file: '' } workaround)
    if (filePath?.endsWith('json')) {
      rootPromises.push(this.processDescriptorFile());
    } else if (filePath?.endsWith('proto')) {
      rootPromises.push(this.processProtoFile());
    } else {
      const reflectionPromises = await this.processReflection(creds);
      rootPromises.push(...reflectionPromises);
    }

    return Promise.all(
      rootPromises.map(async (root$, i) => {
        const root = await root$;
        const rootName = root.name || `Root${i}`;
        const rootLogger = this.log.child({ root: rootName });
        rootLogger.debug(`Resolving entire the root tree`);
        root.resolveAll();
        assertProto3Only(root);
        rootLogger.debug(`Creating artifacts from descriptor set and root`);
        return {
          name: rootName,
          rootJson: root.toJSON({
            keepComments: true,
          }),
        };
      }),
    );
  }

  getCredentials(): MaybePromise<ChannelCredentials> {
    this.log.debug(`Getting channel credentials`);
    if (this.config.credentialsSsl) {
      const ssl = this.config.credentialsSsl;
      this.log.debug(
        () =>
          `Using SSL Connection with credentials at ${ssl.privateKey ?? '(none)'} & ${ssl.certChain ?? '(none)'} (rootCA=${ssl.rootCA ?? '(none)'})`,
      );
      const resolvePath = (p: string) => (path.isAbsolute(p) ? p : path.join(this.baseDir, p));
      const rootCAPath =
        ssl.rootCA && ssl.rootCA !== 'rootCA' ? resolvePath(ssl.rootCA) : undefined;
      const privateKeyPath = ssl.privateKey ? resolvePath(ssl.privateKey) : undefined;
      const certChainPath = ssl.certChain ? resolvePath(ssl.certChain) : undefined;

      if (rootCAPath && !privateKeyPath && !certChainPath) {
        return fs.promises.readFile(rootCAPath).then(rootCA => credentials.createSsl(rootCA));
      }
      if (!privateKeyPath || !certChainPath) {
        throw new Error(
          'credentialsSsl requires both privateKey and certChain for client certificates, or only rootCA for CA-only trust',
        );
      }
      return Promise.all([
        rootCAPath ? fs.promises.readFile(rootCAPath) : Promise.resolve(undefined),
        fs.promises.readFile(privateKeyPath),
        fs.promises.readFile(certChainPath),
      ]).then(([rootCA, privateKey, certChain]) =>
        credentials.createSsl(rootCA, privateKey, certChain),
      );
    } else if (this.config.useHTTPS) {
      this.log.debug(`Using SSL Connection`);
      return credentials.createSsl();
    }
    this.log.debug(`Using insecure connection`);
    return credentials.createInsecure();
  }

  visit({
    nested,
    name,
    currentPath,
    rootJsonName,
    rootJson,
    rootLogger: log,
  }: {
    nested: AnyNestedObject;
    name: string;
    currentPath: string[];
    rootJsonName: string;
    rootJson: protobufjs.INamespace;
    rootLogger: Logger;
  }) {
    const pathWithName = [...currentPath, ...name.split('.')].filter(Boolean);
    if ('nested' in nested) {
      for (const key in nested.nested) {
        log.debug(`Visiting ${currentPath}.nested[${key}]`);
        const currentNested = nested.nested[key];
        this.visit({
          nested: currentNested,
          name: key,
          currentPath: pathWithName,
          rootJsonName,
          rootJson,
          rootLogger: log,
        });
      }
    }
    const typeName = pathWithName.join('__');
    if ('values' in nested) {
      const enumValues: Record<string, EnumTypeComposerValueConfigDefinition> = {};
      const commentMap = (nested as any).comments;
      for (const [key] of Object.entries(nested.values)) {
        log.debug(`Visiting ${currentPath}.nested.values[${key}]`);
        enumValues[key] = {
          description: commentMap?.[key],
        };
      }
      this.schemaComposer.createEnumTC({
        name: typeName,
        values: enumValues,
        description: (nested as any).comment,
      });
    } else if ('fields' in nested) {
      const inputTypeName = typeName + '_Input';
      const outputTypeName = typeName;
      const description = (nested as any).comment;
      const fieldEntries = Object.entries(nested.fields) as [
        string,
        protobufjs.IField & { comment: string; keyType?: string },
      ][];
      if (fieldEntries.length) {
        const inputTC = this.schemaComposer.createInputTC({
          name: inputTypeName,
          description,
          fields: {},
        });
        const outputTC = this.schemaComposer.createObjectTC({
          name: outputTypeName,
          description,
          fields: {},
        });
        for (const [fieldName, { type, rule, comment, keyType }] of fieldEntries) {
          log.debug(`Visiting ${currentPath}.nested.fields[${fieldName}]`);
          const baseFieldTypePath = type.split('.');
          inputTC.addFields({
            [fieldName]: {
              type: () => {
                let fieldInputTypeName: string;
                if (keyType) {
                  fieldInputTypeName = 'JSON';
                } else {
                  const fieldTypePath = walkToFindTypePath(
                    rootJson,
                    pathWithName,
                    baseFieldTypePath,
                  );
                  fieldInputTypeName = getTypeName(this.schemaComposer, fieldTypePath, true);
                }
                return rule === 'repeated' ? `[${fieldInputTypeName}]` : fieldInputTypeName;
              },
              description: comment,
            },
          });
          outputTC.addFields({
            [fieldName]: {
              type: () => {
                let fieldTypeName: string;
                if (keyType) {
                  fieldTypeName = 'JSON';
                } else {
                  const fieldTypePath = walkToFindTypePath(
                    rootJson,
                    pathWithName,
                    baseFieldTypePath,
                  );
                  fieldTypeName = getTypeName(this.schemaComposer, fieldTypePath, false);
                }
                return rule === 'repeated' ? `[${fieldTypeName}]` : fieldTypeName;
              },
              description: comment,
            },
          });
        }
      } else {
        this.schemaComposer.createScalarTC({
          ...GraphQLJSON.toConfig(),
          name: inputTypeName,
          description,
        });
        this.schemaComposer.createScalarTC({
          ...GraphQLJSON.toConfig(),
          name: outputTypeName,
          description,
        });
      }
    } else if ('methods' in nested) {
      const objPath = pathWithName.join('.');
      for (const methodName in nested.methods) {
        const method = nested.methods[methodName];
        const rootFieldName = [...pathWithName, methodName].join('_');
        const fieldConfigTypeFactory = () => {
          const baseResponseTypePath = method.responseType?.split('.');
          if (baseResponseTypePath) {
            const responseTypePath = walkToFindTypePath(
              rootJson,
              pathWithName,
              baseResponseTypePath,
            );
            return getTypeName(this.schemaComposer, responseTypePath, false);
          }
          return 'Void';
        };
        const fieldConfig: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any> = {
          type: () => {
            const typeName = fieldConfigTypeFactory();
            if (method.responseStream) {
              return `[${typeName}]`;
            }
            return typeName;
          },
          description: method.comment,
        };
        const fieldConfigArgs = {
          input: () => {
            const baseRequestTypePath = method.requestType?.split('.');
            if (baseRequestTypePath) {
              const requestTypePath = walkToFindTypePath(
                rootJson,
                pathWithName,
                baseRequestTypePath,
              );
              const requestTypeName = getTypeName(this.schemaComposer, requestTypePath, true);
              return requestTypeName;
            }
            return undefined;
          },
        };
        fieldConfig.args = fieldConfigArgs;
        const methodNameLowerCased = methodName.toLowerCase();
        const prefixQueryMethod = this.config.prefixQueryMethod || QUERY_METHOD_PREFIXES;
        let rootTypeComposer: ObjectTypeComposer;
        if (this.config.selectQueryOrMutationField) {
          const selection = this.config.selectQueryOrMutationField.find(
            selection => micromatch([rootFieldName], selection.fieldName).length > 0,
          );
          const rootTypeName = selection?.type?.toLowerCase();
          if (rootTypeName) {
            if (rootTypeName === 'query') {
              rootTypeComposer = this.schemaComposer.Query;
            } else if (rootTypeName === 'mutation') {
              rootTypeComposer = this.schemaComposer.Mutation;
            } else if (rootTypeName === 'subscription') {
              rootTypeComposer = this.schemaComposer.Subscription;
            } else {
              throw new Error(
                `Unknown type provided ${selection.type} for ${rootFieldName}; available options are Query, Mutation and Subscription`,
              );
            }
          }
        }
        if (rootTypeComposer == null) {
          rootTypeComposer = prefixQueryMethod.some(prefix =>
            methodNameLowerCased.startsWith(prefix),
          )
            ? this.schemaComposer.Query
            : this.schemaComposer.Mutation;
        }
        const serviceName = pathWithName.join('.') || objPath;
        if (method.requestStream) {
          // Client-streaming is unsupported (would be mis-sent as unary). Skip the method
          // so the rest of the service still loads.
          log.warn(
            `Skipping client-streaming gRPC method "${serviceName}.${methodName}"; @protobuf__rpc supports unary and server-streaming only`,
          );
          continue;
        }
        const argsMapping = method.requestType
          ? emitRequestBody(rootJson, pathWithName, method.requestType)
          : '';
        const selection = method.responseType
          ? emitResponseSelection(rootJson, pathWithName, method.responseType)
          : '';
        const rpcDirective = {
          name: 'protobuf__rpc',
          args: {
            subgraph: this.subgraphName,
            service: serviceName,
            method: methodName,
            args: argsMapping,
            selection,
            stream: !!method.responseStream,
          },
        };
        this.schemaComposer.addDirective(protobufRpcDirective);
        rootTypeComposer.addFields({
          [rootFieldName]: {
            ...fieldConfig,
            directives: [rpcDirective],
          },
        });
        if (method.responseStream) {
          this.schemaComposer.Subscription.addFields({
            [rootFieldName]: {
              args: fieldConfigArgs,
              description: method.comment,
              type: fieldConfigTypeFactory,
              directives: [
                {
                  ...rpcDirective,
                  args: { ...rpcDirective.args, stream: true },
                },
              ],
            },
          });
        }
      }
      // connectivity state removed from protobuf author surface
    }
  }
}
