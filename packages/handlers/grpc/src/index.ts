/* eslint-disable import/no-duplicates */
import globby from 'globby';
import { GraphQLEnumTypeConfig, GraphQLResolveInfo, specifiedDirectives } from 'graphql';
import { ObjectTypeComposerFieldConfigAsObjectDefinition, SchemaComposer } from 'graphql-compose';
import {
  GraphQLBigInt,
  GraphQLByte,
  GraphQLJSON,
  GraphQLUnsignedInt,
  GraphQLVoid,
} from 'graphql-scalars';
import lodashGet from 'lodash.get';
import lodashHas from 'lodash.has';
import { AnyNestedObject, IParseOptions, Message, RootConstructor } from 'protobufjs';
import protobufjs from 'protobufjs';
import { IFileDescriptorSet } from 'protobufjs/ext/descriptor';
import descriptor from 'protobufjs/ext/descriptor/index.js';
import { Client } from '@ardatan/grpc-reflection-js';
import { path, process } from '@graphql-mesh/cross-helpers';
import { fs } from '@graphql-mesh/cross-helpers';
import { StoreProxy } from '@graphql-mesh/store';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import {
  Logger,
  MeshHandler,
  MeshHandlerOptions,
  MeshPubSub,
  YamlConfig,
} from '@graphql-mesh/types';
import { ChannelCredentials, credentials, loadPackageDefinition } from '@grpc/grpc-js';
import { fromJSON } from '@grpc/proto-loader';
import './patchLongJs.js';
import { addIncludePathResolver, addMetaDataToCall, getTypeName } from './utils.js';

const { Root } = protobufjs;

interface LoadOptions extends IParseOptions {
  includeDirs?: string[];
}

type DecodedDescriptorSet = Message<IFileDescriptorSet> & IFileDescriptorSet;

type RootJsonEntry = {
  name: string;
  rootJson: protobufjs.INamespace;
};

const QUERY_METHOD_PREFIXES = ['get', 'list', 'search'];

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private baseDir: string;
  private rootJsonEntries: StoreProxy<RootJsonEntry[]>;
  private logger: Logger;
  private pubsub: MeshPubSub;

  constructor({
    config,
    baseDir,
    store,
    logger,
    pubsub,
  }: MeshHandlerOptions<YamlConfig.GrpcHandler>) {
    this.logger = logger;
    this.config = config;
    this.baseDir = baseDir;
    this.rootJsonEntries = store.proxy('rootJsonEntries', {
      codify: rootJsonEntries =>
        `
export default [
${rootJsonEntries
  .map(
    ({ name, rootJson }) => `
  {
    name: ${JSON.stringify(name)},
    rootJson: ${JSON.stringify(rootJson, null, 2)},
  },
`,
  )
  .join('\n')}
];
`.trim(),
      fromJSON: jsonData => {
        return jsonData.map(({ name, rootJson }: any) => ({
          name,
          rootJson,
        }));
      },
      toJSON: rootJsonEntries => {
        return rootJsonEntries.map(({ name, rootJson }) => {
          return {
            name,
            rootJson,
          };
        });
      },
      validate: () => {},
    });
    this.pubsub = pubsub;
  }

  async processReflection(creds: ChannelCredentials): Promise<Promise<protobufjs.Root>[]> {
    this.logger.debug(`Using the reflection`);
    const grpcReflectionServer = this.config.endpoint;
    this.logger.debug(`Creating gRPC Reflection Client`);
    const reflectionClient = new Client(grpcReflectionServer, creds);
    const subId = this.pubsub.subscribe('destroy', () => {
      reflectionClient.grpcClient.close();
      this.pubsub.unsubscribe(subId);
    });
    const services: (string | void)[] = await reflectionClient.listServices();
    const userServices = services.filter(
      service => service && !service?.startsWith('grpc.'),
    ) as string[];
    return userServices.map(async service => {
      this.logger.debug(`Resolving root of Service: ${service} from the reflection response`);
      const serviceRoot = await reflectionClient.fileContainingSymbol(service);
      return serviceRoot;
    });
  }

  async processDescriptorFile() {
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
      ) as DecodedDescriptorSet;
    } else {
      decodedDescriptorSet = descriptor.FileDescriptorSet.decode(
        descriptorSetBuffer,
      ) as DecodedDescriptorSet;
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

  async processProtoFile() {
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

  getCachedDescriptorSets(creds: ChannelCredentials) {
    return this.rootJsonEntries.getWithSet(async () => {
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
          const rootLogger = this.logger.child(rootName);
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
    });
  }

  async getCredentials(): Promise<ChannelCredentials> {
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
      const [rootCA, privateKey, certChain] = await Promise.all(sslFiles);
      return credentials.createSsl(rootCA, privateKey, certChain);
    } else if (this.config.useHTTPS) {
      this.logger.debug(`Using SSL Connection`);
      return credentials.createSsl();
    }
    this.logger.debug(`Using insecure connection`);
    return credentials.createInsecure();
  }

  walkToFindTypePath(
    rootJson: protobufjs.INamespace,
    pathWithName: string[],
    baseTypePath: string[],
  ) {
    const currentWalkingPath = [...pathWithName];
    while (!lodashHas(rootJson.nested, currentWalkingPath.concat(baseTypePath).join('.nested.'))) {
      if (!currentWalkingPath.length) {
        break;
      }
      currentWalkingPath.pop();
    }
    return currentWalkingPath.concat(baseTypePath);
  }

  visit({
    nested,
    name,
    currentPath,
    rootJson,
    creds,
    grpcObject,
    rootLogger: logger,
  }: {
    nested: AnyNestedObject;
    name: string;
    currentPath: string[];
    rootJson: protobufjs.INamespace;
    creds: ChannelCredentials;
    grpcObject: ReturnType<typeof loadPackageDefinition>;
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
          rootJson,
          creds,
          grpcObject,
          rootLogger: logger,
        });
      }
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
        logger.debug(`Visiting ${currentPath}.nested.values[${key}]`);
        enumTypeConfig.values[key] = {
          value,
          description: commentMap?.[key],
        };
      }
      this.schemaComposer.createEnumTC(enumTypeConfig);
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
                  const fieldTypePath = this.walkToFindTypePath(
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
                  const fieldTypePath = this.walkToFindTypePath(
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
      const ServiceClient = lodashGet(grpcObject, objPath);
      if (typeof ServiceClient !== 'function') {
        throw new Error(`Object at path ${objPath} is not a Service constructor`);
      }
      const client = new ServiceClient(
        stringInterpolator.parse(this.config.endpoint, { env: process.env }) ??
          this.config.endpoint,
        creds,
      );
      const subId = this.pubsub.subscribe('destroy', () => {
        client.close();
        this.pubsub.unsubscribe(subId);
      });
      for (const methodName in nested.methods) {
        const method = nested.methods[methodName];
        const rootFieldName = [...pathWithName, methodName].join('_');
        const fieldConfig: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any> = {
          type: () => {
            const baseResponseTypePath = method.responseType?.split('.');
            if (baseResponseTypePath) {
              const responseTypePath = this.walkToFindTypePath(
                rootJson,
                pathWithName,
                baseResponseTypePath,
              );
              let typeName = getTypeName(this.schemaComposer, responseTypePath, false);
              if (method.responseStream) {
                typeName = `[${typeName}]`;
              }
              return typeName;
            }
            return 'Void';
          },
          description: method.comment,
        };
        fieldConfig.args = {
          input: () => {
            if (method.requestStream) {
              return 'File';
            }
            const baseRequestTypePath = method.requestType?.split('.');
            if (baseRequestTypePath) {
              const requestTypePath = this.walkToFindTypePath(
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
        const methodNameLowerCased = methodName.toLowerCase();
        const prefixQueryMethod = this.config.prefixQueryMethod || QUERY_METHOD_PREFIXES;
        const rootTypeComposer = prefixQueryMethod.some(prefix =>
          methodNameLowerCased.startsWith(prefix),
        )
          ? this.schemaComposer.Query
          : this.schemaComposer.Mutation;
        rootTypeComposer.addFields({
          [rootFieldName]: {
            ...fieldConfig,
            resolve: (
              root,
              args: Record<string, unknown>,
              context: Record<string, unknown>,
              info: GraphQLResolveInfo,
            ) =>
              addMetaDataToCall(
                client[methodName].bind(client),
                args.input,
                {
                  root,
                  args,
                  context,
                  env: process.env,
                },
                this.config.metaData,
                !!method.responseStream,
              ),
          },
        });
      }
      const connectivityStateFieldName = pathWithName.join('_') + '_connectivityState';
      this.schemaComposer.Query.addFields({
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
  }

  private schemaComposer = new SchemaComposer();

  async getMeshSource() {
    this.config.requestTimeout = this.config.requestTimeout || 200000;

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

    this.logger.debug(`Getting channel credentials`);
    const creds = await this.getCredentials();

    this.logger.debug(`Getting stored root and decoded descriptor set objects`);
    const artifacts = await this.getCachedDescriptorSets(creds);

    for (const { name, rootJson } of artifacts) {
      const rootLogger = this.logger.child(name);

      rootLogger.debug(`Creating package definition from file descriptor set object`);
      const packageDefinition = fromJSON(rootJson);

      rootLogger.debug(`Creating service client for package definition`);
      const grpcObject = loadPackageDefinition(packageDefinition);

      this.logger.debug(`Building the schema structure based on the root object`);
      this.visit({
        nested: rootJson,
        name: '',
        currentPath: [],
        rootJson,
        creds,
        grpcObject,
        rootLogger,
      });
    }

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => this.schemaComposer.addDirective(directive));

    this.logger.debug(`Building the final GraphQL Schema`);
    const schema = this.schemaComposer.buildSchema();

    return {
      schema,
    };
  }
}
