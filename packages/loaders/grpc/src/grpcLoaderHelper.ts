import globby from 'globby';
import { specifiedDirectives } from 'graphql';
import {
  SchemaComposer,
  type Directive,
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
import protobufjs, {
  type AnyNestedObject,
  type IParseOptions,
  type RootConstructor,
} from 'protobufjs';
import type { IFileDescriptorSet } from 'protobufjs/ext/descriptor';
import descriptor from 'protobufjs/ext/descriptor/index.js';
import { Client } from '@ardatan/grpc-reflection-js';
import { fs, path } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { Logger, YamlConfig } from '@graphql-mesh/types';
import { GraphQLStreamDirective, type MaybePromise } from '@graphql-tools/utils';
import { credentials, type ChannelCredentials } from '@grpc/grpc-js';
import { DisposableStack } from '@whatwg-node/disposablestack';
import {
  EnumDirective,
  grpcConnectivityStateDirective,
  grpcMethodDirective,
  transportDirective,
} from './directives.js';
import { addIncludePathResolver, getTypeName, walkToFindTypePath } from './utils.js';

const { Root } = protobufjs;

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
    private logger: Logger,
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
    // identical of grpc's ConnectivityState
    this.schemaComposer.createEnumTC({
      name: 'ConnectivityState',
      values: {
        IDLE: { value: 0 },
        CONNECTING: { value: 1 },
        READY: { value: 2 },
        TRANSIENT_FAILURE: { value: 3 },
        SHUTDOWN: { value: 4 },
      },
    });

    this.config.requestTimeout = this.config.requestTimeout || 200000;

    this.logger.debug(`Getting channel credentials`);
    const creds = await this.getCredentials();
    this.defer(() => creds._unref());

    this.logger.debug(`Getting stored root and decoded descriptor set objects`);
    const descriptorSets = await this.getDescriptorSets(creds);

    const directives: Directive[] = [];
    const roots: {
      name: string;
      rootJson: string;
    }[] = [];
    for (const { name: rootJsonName, rootJson } of descriptorSets) {
      const rootLogger = this.logger.child({ root: rootJsonName });

      this.logger.debug(`Building the schema structure based on the root object`);
      this.visit({
        nested: rootJson,
        name: '',
        currentPath: [],
        rootJsonName,
        rootJson,
        rootLogger,
      });
      roots.push({ name: rootJsonName, rootJson: JSON.stringify(rootJson) });
    }
    this.schemaComposer.Query.setDirectives(directives);

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => this.schemaComposer.addDirective(directive));

    if (!this.schemaComposer.hasDirective('stream')) {
      this.schemaComposer.addDirective(GraphQLStreamDirective);
    }

    this.logger.debug(`Building the final GraphQL Schema`);
    this.schemaComposer.addDirective(transportDirective);
    const schema = this.schemaComposer.buildSchema();
    const schemaExtensions: Record<string, any> = (schema.extensions = schema.extensions || {});
    const directiveExtensions = (schemaExtensions.directives = schemaExtensions.directives || {});
    directiveExtensions.transport = {
      subgraph: this.subgraphName,
      kind: 'grpc',
      location: this.config.endpoint,
      options: {
        requestTimeout: this.config.requestTimeout,
        credentialsSsl: this.config.credentialsSsl,
        useHTTPS: this.config.useHTTPS,
        metaData: this.config.metaData,
        roots,
      },
    };
    return schema;
  }

  private processReflection(creds: ChannelCredentials): Promise<Promise<protobufjs.Root>[]> {
    this.logger.debug(`Using the reflection`);
    const reflectionEndpoint = stringInterpolator.parse(this.config.endpoint, { env: process.env });
    this.logger.debug(`Creating gRPC Reflection Client`);
    const reflectionClient = new Client(reflectionEndpoint, creds);
    this.defer(() => reflectionClient.grpcClient.close());
    return reflectionClient.listServices().then(services =>
      (services.filter(service => service && !service?.startsWith('grpc.')) as string[]).map(
        service => {
          this.logger.debug(`Resolving root of Service: ${service} from the reflection response`);
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
    fileName = stringInterpolator.parse(fileName, { env: process.env });
    const absoluteFilePath = path.isAbsolute(fileName)
      ? fileName
      : path.join(this.baseDir, fileName);
    this.logger.debug(`Using the descriptor set from ${absoluteFilePath} `);
    const descriptorSetBuffer = await fs.promises.readFile(absoluteFilePath);
    this.logger.debug(`Reading ${absoluteFilePath} `);
    let decodedDescriptorSet: DecodedDescriptorSet;
    if (absoluteFilePath.endsWith('json')) {
      this.logger.debug(`Parsing ${absoluteFilePath} as json`);
      const descriptorSetJSON = JSON.parse(descriptorSetBuffer.toString());
      decodedDescriptorSet = descriptor.FileDescriptorSet.fromObject(
        descriptorSetJSON,
      ) as unknown as DecodedDescriptorSet;
    } else {
      decodedDescriptorSet = descriptor.FileDescriptorSet.decode(
        descriptorSetBuffer,
      ) as unknown as DecodedDescriptorSet;
    }
    this.logger.debug(`Creating root from descriptor set`);
    const rootFromDescriptor = (Root as RootConstructor).fromDescriptor(decodedDescriptorSet);
    if (options.includeDirs) {
      if (!Array.isArray(options.includeDirs)) {
        return Promise.reject(new Error('The includeDirs option must be an array'));
      }
      addIncludePathResolver(rootFromDescriptor, options.includeDirs);
    }
    return rootFromDescriptor;
  }

  private async processProtoFile() {
    this.logger.debug(`Using proto file(s)`);
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

    fileGlob = stringInterpolator.parse(fileGlob, { env: process.env });

    const fileNames = await globby(fileGlob, {
      cwd: this.baseDir,
    });
    this.logger.debug(`Loading proto files(${fileGlob}); \n ${fileNames.join('\n')} `);
    protoRoot = await protoRoot.load(
      fileNames.map(filePath =>
        path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath),
      ),
      options,
    );
    this.logger.debug(`Adding proto content to the root`);
    return protoRoot;
  }

  private async getDescriptorSets(creds: ChannelCredentials) {
    const rootPromises: Promise<protobufjs.Root>[] = [];
    this.logger.debug(`Building Roots`);
    if (this.config.source) {
      const filePath =
        typeof this.config.source === 'string' ? this.config.source : this.config.source.file;
      if (filePath.endsWith('json')) {
        rootPromises.push(this.processDescriptorFile());
      } else if (filePath.endsWith('proto')) {
        rootPromises.push(this.processProtoFile());
      }
    } else {
      const reflectionPromises = await this.processReflection(creds);
      rootPromises.push(...reflectionPromises);
    }

    return Promise.all(
      rootPromises.map(async (root$, i) => {
        const root = await root$;
        const rootName = root.name || `Root${i}`;
        const rootLogger = this.logger.child({ root: rootName });
        rootLogger.debug(`Resolving entire the root tree`);
        root.resolveAll();
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
    this.logger.debug(`Getting channel credentials`);
    if (this.config.credentialsSsl) {
      this.logger.debug(
        () =>
          `Using SSL Connection with credentials at ${this.config.credentialsSsl.privateKey} & ${this.config.credentialsSsl.certChain}`,
      );
      const absolutePrivateKeyPath = path.isAbsolute(this.config.credentialsSsl.privateKey)
        ? this.config.credentialsSsl.privateKey
        : path.join(this.baseDir, this.config.credentialsSsl.privateKey);
      const absoluteCertChainPath = path.isAbsolute(this.config.credentialsSsl.certChain)
        ? this.config.credentialsSsl.certChain
        : path.join(this.baseDir, this.config.credentialsSsl.certChain);

      const sslFiles = [
        fs.promises.readFile(absolutePrivateKeyPath),
        fs.promises.readFile(absoluteCertChainPath),
      ];
      if (this.config.credentialsSsl.rootCA !== 'rootCA') {
        const absoluteRootCAPath = path.isAbsolute(this.config.credentialsSsl.rootCA)
          ? this.config.credentialsSsl.rootCA
          : path.join(this.baseDir, this.config.credentialsSsl.rootCA);
        sslFiles.unshift(fs.promises.readFile(absoluteRootCAPath));
      }
      return Promise.all(sslFiles).then(([rootCA, privateKey, certChain]) =>
        credentials.createSsl(rootCA, privateKey, certChain),
      );
    } else if (this.config.useHTTPS) {
      this.logger.debug(`Using SSL Connection`);
      return credentials.createSsl();
    }
    this.logger.debug(`Using insecure connection`);
    return credentials.createInsecure();
  }

  visit({
    nested,
    name,
    currentPath,
    rootJsonName,
    rootJson,
    rootLogger: logger,
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
        logger.debug(`Visiting ${currentPath}.nested[${key}]`);
        const currentNested = nested.nested[key];
        this.visit({
          nested: currentNested,
          name: key,
          currentPath: pathWithName,
          rootJsonName,
          rootJson,
          rootLogger: logger,
        });
      }
    }
    const typeName = pathWithName.join('__');
    if ('values' in nested) {
      const enumValues: Record<string, EnumTypeComposerValueConfigDefinition> = {};
      const commentMap = (nested as any).comments;
      for (const [key, value] of Object.entries(nested.values)) {
        logger.debug(`Visiting ${currentPath}.nested.values[${key}]`);
        enumValues[key] = {
          directives: [
            {
              name: 'enum',
              args: {
                subgraph: this.subgraphName,
                value: JSON.stringify(value),
              },
            },
          ],
          description: commentMap?.[key],
        };
      }
      this.schemaComposer.addDirective(EnumDirective);
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
          logger.debug(`Visiting ${currentPath}.nested.fields[${fieldName}]`);
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
            if (method.requestStream) {
              return 'File';
            }
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
        this.schemaComposer.addDirective(grpcMethodDirective);
        rootTypeComposer.addFields({
          [rootFieldName]: {
            ...fieldConfig,
            directives: [
              {
                name: 'grpcMethod',
                args: {
                  subgraph: this.subgraphName,
                  rootJsonName,
                  objPath,
                  methodName,
                  responseStream: !!method.responseStream,
                },
              },
            ],
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
                  name: 'grpcMethod',
                  args: {
                    subgraph: this.subgraphName,
                    rootJsonName,
                    objPath,
                    methodName,
                    responseStream: true,
                  },
                },
              ],
            },
          });
        }
      }
      const connectivityStateFieldName = pathWithName.join('_') + '_connectivityState';
      this.schemaComposer.addDirective(grpcConnectivityStateDirective);
      this.schemaComposer.Query.addFields({
        [connectivityStateFieldName]: {
          type: 'ConnectivityState',
          args: {
            tryToConnect: {
              type: 'Boolean',
            },
          },
          directives: [
            {
              name: 'grpcConnectivityState',
              args: {
                subgraph: this.subgraphName,
                rootJsonName,
                objPath,
              },
            },
          ],
        },
      });
    }
  }
}
