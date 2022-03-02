/* eslint-disable import/no-duplicates */
import './patchLongJs';
import { GetMeshSourceOptions, Logger, MeshHandler, YamlConfig } from '@graphql-mesh/types';
import { withCancel } from '@graphql-mesh/utils';
import { ChannelCredentials, ClientUnaryCall, Metadata, credentials, loadPackageDefinition } from '@grpc/grpc-js';
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
  name: string;
  rootJson: protobufjs.INamespace;
  decodedDescriptorSet: DecodedDescriptorSet;
};

const QUERY_METHOD_PREFIXES = ['get', 'list'];

export default class GrpcHandler implements MeshHandler {
  private config: YamlConfig.GrpcHandler;
  private baseDir: string;
  private rootJsonAndDecodedDescriptorSets: StoreProxy<RootJsonAndDecodedDescriptorSet[]>;
  private logger: Logger;

  constructor({ config, baseDir, store, logger }: GetMeshSourceOptions<YamlConfig.GrpcHandler>) {
    this.logger = logger;
    this.config = config;
    this.baseDir = baseDir;
    this.rootJsonAndDecodedDescriptorSets = store.proxy('descriptorSet.proto', {
      codify: rootJsonAndDecodedDescriptorSets =>
        `
import { FileDescriptorSet } from 'protobufjs/ext/descriptor/index.js';

export default [
${rootJsonAndDecodedDescriptorSets
  .map(
    ({ name, rootJson, decodedDescriptorSet }) => `
  {
    name: ${JSON.stringify(name)},
    decodedDescriptorSet: FileDescriptorSet.fromObject(${JSON.stringify(decodedDescriptorSet.toJSON(), null, 2)}),
    rootJson: ${JSON.stringify(rootJson, null, 2)},
  },
`
  )
  .join('\n')}
];
`.trim(),
      validate: () => {},
    });
  }

  async getRootPromisesFromReflection(creds: ChannelCredentials): Promise<Promise<protobufjs.Root>[]> {
    this.logger.debug(() => `Using the reflection`);
    const grpcReflectionServer = this.config.endpoint;
    this.logger.debug(() => `Creating gRPC Reflection Client`);
    const reflectionClient = new grpcReflection.Client(grpcReflectionServer, creds);
    const services: (string | void)[] = await reflectionClient.listServices();
    const userServices = services.filter(service => service && !service?.startsWith('grpc.')) as string[];
    return userServices.map(async service => {
      this.logger.debug(() => `Resolving root of Service: ${service} from the reflection response`);
      const serviceRoot = await reflectionClient.fileContainingSymbol(service);
      return serviceRoot;
    });
  }

  async getRootPromiseFromDescriptorFilePath() {
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
    } else {
      fileName = this.config.descriptorSetFilePath;
    }
    const absoluteFilePath = isAbsolute(fileName) ? fileName : join(this.baseDir, fileName);
    this.logger.debug(() => `Using the descriptor set from ${absoluteFilePath} `);
    const descriptorSetBuffer = await readFile(absoluteFilePath);
    this.logger.debug(() => `Reading ${absoluteFilePath} `);
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
    if (options.includeDirs) {
      if (!Array.isArray(options.includeDirs)) {
        return Promise.reject(new Error('The includeDirs option must be an array'));
      }
      addIncludePathResolver(rootFromDescriptor, options.includeDirs);
    }
    return rootFromDescriptor;
  }

  async getRootPromiseFromProtoFilePath() {
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
    this.logger.debug(() => `Loading proto files(${fileGlob}); \n ${fileNames.join('\n')} `);
    protoRoot = await protoRoot.load(
      fileNames.map(filePath => (isAbsolute(filePath) ? filePath : join(this.baseDir, filePath))),
      options
    );
    this.logger.debug(() => `Adding proto content to the root`);
    return protoRoot;
  }

  getCachedDescriptorSets(creds: ChannelCredentials) {
    return this.rootJsonAndDecodedDescriptorSets.getWithSet(async () => {
      const rootPromises: Promise<protobufjs.Root>[] = [];
      this.logger.debug(() => `Building Roots`);
      if (this.config.useReflection) {
        const reflectionPromises = await this.getRootPromisesFromReflection(creds);
        rootPromises.push(...reflectionPromises);
      }
      if (this.config.descriptorSetFilePath) {
        const rootPromise = this.getRootPromiseFromDescriptorFilePath();
        rootPromises.push(rootPromise);
      }

      if (this.config.protoFilePath) {
        const rootPromise = this.getRootPromiseFromProtoFilePath();
        rootPromises.push(rootPromise);
      }

      return Promise.all(
        rootPromises.map(async (root$, i) => {
          const root = await root$;
          const rootName = root.name || `Root${i}`;
          const rootLogger = this.logger.child(rootName);
          rootLogger.debug(() => `Resolving entire the root tree`);
          root.resolveAll();
          rootLogger.debug(() => `Creating artifacts from descriptor set and root`);
          return {
            name: rootName,
            rootJson: root.toJSON({
              keepComments: true,
            }),
            decodedDescriptorSet: root.toDescriptor('proto3'),
          };
        })
      );
    });
  }

  async getCredentials(): Promise<ChannelCredentials> {
    if (this.config.credentialsSsl) {
      this.logger.debug(
        () =>
          `Using SSL Connection with credentials at ${this.config.credentialsSsl.privateKey} & ${this.config.credentialsSsl.certChain}`
      );
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
      return credentials.createSsl(rootCA, privateKey, certChain);
    } else if (this.config.useHTTPS) {
      this.logger.debug(() => `Using SSL Connection`);
      return credentials.createSsl();
    }
    this.logger.debug(() => `Using insecure connection`);
    return credentials.createInsecure();
  }

  walkToFindTypePath(rootJson: protobufjs.INamespace, pathWithName: string[], baseTypePath: string[]) {
    const currentWalkingPath = [...pathWithName];
    while (!_.has(rootJson.nested, currentWalkingPath.concat(baseTypePath).join('.nested.'))) {
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
        logger.debug(() => `Visiting ${currentPath}.nested[${key}]`);
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
        logger.debug(() => `Visiting ${currentPath}.nested.values[${key}]`);
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
      const fieldEntries = Object.entries(nested.fields) as [string, protobufjs.IField & { comment: string }][];
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
        for (const [fieldName, { type, rule, comment }] of fieldEntries) {
          logger.debug(() => `Visiting ${currentPath}.nested.fields[${fieldName}]`);
          const baseFieldTypePath = type.split('.');
          inputTC.addFields({
            [fieldName]: {
              type: () => {
                const fieldTypePath = this.walkToFindTypePath(rootJson, pathWithName, baseFieldTypePath);
                const fieldInputTypeName = getTypeName(this.schemaComposer, fieldTypePath, true);
                return rule === 'repeated' ? `[${fieldInputTypeName}]` : fieldInputTypeName;
              },
              description: comment,
            },
          });
          outputTC.addFields({
            [fieldName]: {
              type: () => {
                const fieldTypePath = this.walkToFindTypePath(rootJson, pathWithName, baseFieldTypePath);
                const fieldTypeName = getTypeName(this.schemaComposer, fieldTypePath, false);
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
      const ServiceClient = _.get(grpcObject, objPath);
      if (typeof ServiceClient !== 'function') {
        throw new Error(`Object at path ${objPath} is not a Service constructor`);
      }
      const client = new ServiceClient(this.config.endpoint, creds);
      for (const methodName in nested.methods) {
        const method = nested.methods[methodName];
        const rootFieldName = [...pathWithName, methodName].join('_');
        const fieldConfig: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any> = {
          type: () => {
            const baseResponseTypePath = method.responseType?.split('.');
            if (baseResponseTypePath) {
              const responseTypePath = this.walkToFindTypePath(rootJson, pathWithName, baseResponseTypePath);
              return getTypeName(this.schemaComposer, responseTypePath, false);
            }
            return 'Void';
          },
          description: method.comment,
        };
        fieldConfig.args = {
          input: () => {
            const baseRequestTypePath = method.requestType?.split('.');
            if (baseRequestTypePath) {
              const requestTypePath = this.walkToFindTypePath(rootJson, pathWithName, baseRequestTypePath);
              const requestTypeName = getTypeName(this.schemaComposer, requestTypePath, true);
              return requestTypeName;
            }
            return undefined;
          },
        };
        if (method.responseStream) {
          const clientMethod: any = (input: unknown = {}, metaData: Metadata) => {
            const responseStream = client[methodName](input, metaData);
            let isCancelled = false;
            const responseStreamWithCancel = withCancel(responseStream, () => {
              if (!isCancelled) {
                responseStream.call?.cancelWithStatus(0, 'Cancelled by GraphQL Mesh');
                isCancelled = true;
              }
            });
            return responseStreamWithCancel;
          };
          this.schemaComposer.Subscription.addFields({
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
            ? this.schemaComposer.Query
            : this.schemaComposer.Mutation;
          rootTypeComposer.addFields({
            [rootFieldName]: {
              ...fieldConfig,
              resolve: (_, args: Record<string, unknown>, context: Record<string, unknown>) =>
                addMetaDataToCall(clientMethod, args.input, context, this.config.metaData),
            },
          });
        }
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

    this.logger.debug(() => `Getting channel credentials`);
    const creds = await this.getCredentials();

    this.logger.debug(() => `Getting stored root and decoded descriptor set objects`);
    const artifacts = await this.getCachedDescriptorSets(creds);

    for (const { name, rootJson, decodedDescriptorSet } of artifacts) {
      const rootLogger = this.logger.child(name);

      rootLogger.debug(() => `Creating package definition from file descriptor set object`);
      const packageDefinition = loadFileDescriptorSetFromObject(decodedDescriptorSet);

      rootLogger.debug(() => `Creating service client for package definition`);
      const grpcObject = loadPackageDefinition(packageDefinition);

      this.logger.debug(() => `Building the schema structure based on the root object`);
      this.visit({ nested: rootJson, name: '', currentPath: [], rootJson, creds, grpcObject, rootLogger });
    }

    // graphql-compose doesn't add @defer and @stream to the schema
    specifiedDirectives.forEach(directive => this.schemaComposer.addDirective(directive));

    this.logger.debug(() => `Building the final GraphQL Schema`);
    const schema = this.schemaComposer.buildSchema();

    return {
      schema,
    };
  }
}
