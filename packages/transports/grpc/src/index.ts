import {
  isEnumType,
  type GraphQLFieldResolver,
  type GraphQLScalarType,
  type GraphQLSchema,
} from 'graphql';
import { resolvers as scalarResolvers } from 'graphql-scalars';
import lodashGet from 'lodash.get';
import type protobufjs from 'protobufjs';
import { fs, path, process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import {
  createDefaultExecutor,
  ObjMapScalar,
  type Transport,
} from '@graphql-mesh/transport-common';
import type { Logger } from '@graphql-mesh/types';
import {
  getDirective,
  getDirectives,
  getRootTypes,
  mapMaybePromise,
  type MaybePromise,
} from '@graphql-tools/utils';
import type { ChannelCredentials } from '@grpc/grpc-js';
import { credentials, loadPackageDefinition } from '@grpc/grpc-js';
import type { ServiceClient } from '@grpc/grpc-js/build/src/make-client.js';
import { fromJSON } from '@grpc/proto-loader';
import { DisposableStack } from '@whatwg-node/disposablestack';
import { addExecutionLogicToScalar, addMetaDataToCall } from './utils.js';
import './patchLongJs.js';
import { makeDisposable } from '@graphql-mesh/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

/**
 * SSL Credentials
 */
interface GrpcCredentialsSsl {
  rootCA?: string;
  certChain?: string;
  privateKey?: string;
}

export interface gRPCTransportOptions {
  /**
   * Request timeout in milliseconds
   * Default: 200000
   */
  requestTimeout?: number;
  credentialsSsl?: GrpcCredentialsSsl;
  /**
   * Use https instead of http for gRPC connection
   */
  useHTTPS?: boolean;
  /**
   * MetaData
   */
  metaData?: {
    [k: string]: any;
  };
}

interface LoadOptions {
  includeDirs?: string[];
}

export class GrpcTransportHelper extends DisposableStack {
  constructor(
    private subgraphName: string,
    private baseDir: string,
    private logger: Logger,
    private endpoint: string,
    private config: gRPCTransportOptions,
  ) {
    super();
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

  getGrpcObject({
    rootJson,
    loadOptions,
    rootLogger,
  }: {
    rootJson: protobufjs.INamespace;
    loadOptions: LoadOptions;
    rootLogger: Logger;
  }) {
    const packageDefinition = fromJSON(rootJson, loadOptions);

    rootLogger.debug(`Creating service client for package definition`);
    const grpcObject = loadPackageDefinition(packageDefinition);
    return grpcObject;
  }

  private grpcObjectByserviceClientByObjPath = new WeakMap<
    ReturnType<typeof loadPackageDefinition>,
    Map<string, ServiceClient>
  >();

  getServiceClient({
    grpcObject,
    objPath,
    creds,
  }: {
    grpcObject: ReturnType<typeof loadPackageDefinition>;
    objPath: string;
    creds: ChannelCredentials;
  }) {
    let serviceClientByObjPath = this.grpcObjectByserviceClientByObjPath.get(grpcObject);
    if (!serviceClientByObjPath) {
      serviceClientByObjPath = new Map<string, ServiceClient>();
      this.grpcObjectByserviceClientByObjPath.set(grpcObject, serviceClientByObjPath);
    }
    let client: ServiceClient = serviceClientByObjPath.get(objPath);
    if (!client) {
      const ServiceClient = lodashGet(grpcObject, objPath);
      if (typeof ServiceClient !== 'function') {
        throw new Error(`Object at path ${objPath} is not a Service constructor`);
      }
      client = new ServiceClient(
        stringInterpolator.parse(this.endpoint, { env: process.env }) ?? this.endpoint,
        creds,
      );
      this.defer(() => client.close());
      serviceClientByObjPath.set(objPath, client);
    }
    return client;
  }

  getFieldResolver({
    client,
    methodName,
    isResponseStream,
  }: {
    client: ServiceClient;
    methodName: string;
    isResponseStream: boolean;
  }): GraphQLFieldResolver<any, any> {
    const metaData = this.config.metaData;
    const clientMethod = client[methodName].bind(client);
    return function grpcFieldResolver(root, args, context) {
      return addMetaDataToCall(
        clientMethod,
        args.input,
        {
          root,
          args,
          context,
          env: process.env,
        },
        metaData,
        isResponseStream,
      );
    };
  }

  getConnectivityStateResolver({
    client,
  }: {
    client: ServiceClient;
  }): GraphQLFieldResolver<any, any> {
    return function connectivityStateResolver(_, { tryToConnect }) {
      return client.getChannel().getConnectivityState(tryToConnect);
    };
  }

  processDirectives({ schema, creds }: { schema: GraphQLSchema; creds: ChannelCredentials }) {
    const schemaTypeMap = schema.getTypeMap();
    for (const scalarTypeName in scalarResolvers) {
      if (scalarTypeName in schemaTypeMap) {
        addExecutionLogicToScalar(
          schemaTypeMap[scalarTypeName] as GraphQLScalarType,
          scalarResolvers[scalarTypeName],
        );
      }
    }
    if ('ObjMap' in schemaTypeMap) {
      addExecutionLogicToScalar(schemaTypeMap.ObjMap as GraphQLScalarType, ObjMapScalar);
    }
    let roots: { name: string; rootJson: any; loadOptions: LoadOptions }[];
    const transportDirective = getDirective(schema, schema, 'transport');
    if (transportDirective) {
      for (const directive of transportDirective) {
        if (
          directive?.subgraph != null &&
          this.subgraphName != null &&
          directive.subgraph !== this.subgraphName
        ) {
          continue;
        }
        if (directive?.options?.roots) {
          roots = directive.options.roots;
          break;
        }
      }
    }
    if (!roots?.length) {
      throw new Error(`No roots found for subgraph '${this.subgraphName}'`);
    }
    const grpcObjectByRootJsonName = new Map<string, ReturnType<typeof loadPackageDefinition>>();
    for (let { name, rootJson, loadOptions } of roots) {
      rootJson = typeof rootJson === 'string' ? JSON.parse(rootJson) : rootJson;
      const rootLogger = this.logger.child({ root: name });
      grpcObjectByRootJsonName.set(name, this.getGrpcObject({ rootJson, loadOptions, rootLogger }));
    }
    const rootTypes = getRootTypes(schema);
    for (const rootType of rootTypes) {
      const rootTypeFields = rootType.getFields();
      for (const fieldName in rootTypeFields) {
        const field = rootTypeFields[fieldName];
        const directives = getDirectives(schema, field);
        if (directives?.length) {
          for (const directiveObj of directives) {
            if (
              this.subgraphName &&
              directiveObj.args?.subgraph &&
              directiveObj.args.subgraph !== this.subgraphName
            ) {
              continue;
            }
            switch (directiveObj.name) {
              case 'grpcMethod': {
                const { rootJsonName, objPath, methodName, responseStream } = directiveObj.args;
                const grpcObject = grpcObjectByRootJsonName.get(rootJsonName);
                if (!grpcObject) {
                  throw new Error(
                    `Root JSON '${rootJsonName}' not found for subgraph '${this.subgraphName}'`,
                  );
                }
                const client = this.getServiceClient({
                  grpcObject,
                  objPath,
                  creds,
                });
                if (rootType.name === 'Subscription') {
                  field.subscribe = this.getFieldResolver({
                    client,
                    methodName,
                    isResponseStream: responseStream,
                  });
                  field.resolve = identityFn;
                } else {
                  field.resolve = this.getFieldResolver({
                    client,
                    methodName,
                    isResponseStream: responseStream,
                  });
                }
                break;
              }
              case 'grpcConnectivityState': {
                const { rootJsonName, objPath } = directiveObj.args;
                const grpcObject = grpcObjectByRootJsonName.get(rootJsonName);
                if (!grpcObject) {
                  throw new Error(
                    `Root JSON '${rootJsonName}' not found for subgraph '${this.subgraphName}'`,
                  );
                }
                const client = this.getServiceClient({
                  grpcObject,
                  objPath,
                  creds,
                });
                field.resolve = this.getConnectivityStateResolver({ client });
                break;
              }
            }
          }
        }
      }
    }
    const typeMap = schema.getTypeMap();
    for (const typeName in typeMap) {
      const type = typeMap[typeName];
      if (isEnumType(type)) {
        const values = type.getValues();
        for (const value of values) {
          const enumAnnotations = getDirective(schema, value, 'enum');
          if (enumAnnotations?.length) {
            for (const enumAnnotation of enumAnnotations) {
              const enumSerializedValue = enumAnnotation.value;
              if (enumSerializedValue) {
                const serializedValue = JSON.parse(enumSerializedValue);
                value.value = serializedValue;
                let valueLookup = (type as any)._valueLookup;
                if (!valueLookup) {
                  valueLookup = new Map(
                    type.getValues().map(enumValue => [enumValue.value, enumValue]),
                  );
                  (type as any)._valueLookup = valueLookup;
                }
                (type as any)._valueLookup.set(serializedValue, value);
              }
            }
          }
        }
      }
    }
  }
}

export default {
  getSubgraphExecutor({ transportEntry, subgraph, cwd, logger }) {
    const transport = new GrpcTransportHelper(
      transportEntry.subgraph,
      cwd,
      logger,
      transportEntry.location,
      transportEntry.options,
    );
    return handleMaybePromise(
      () => transport.getCredentials(),
      creds => {
        transport.processDirectives({ schema: subgraph, creds });
        return makeDisposable(createDefaultExecutor(subgraph), () => transport.dispose());
      },
    );
  },
} satisfies Transport<gRPCTransportOptions>;

function identityFn<T>(obj: T): T {
  return obj;
}
