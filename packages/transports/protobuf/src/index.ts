import {
  getNamedType,
  GraphQLError,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  isObjectType,
  type GraphQLField,
  type GraphQLFieldResolver,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import { entitiesResolver } from '@apollo/subgraph';
import type { Logger } from '@graphql-hive/logger';
import { fs, path, process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { createDefaultExecutor, type Transport } from '@graphql-mesh/transport-common';
import type { MeshFetch } from '@graphql-mesh/types';
import { getDirectives } from '@graphql-tools/utils';
import {
  credentials,
  makeGenericClientConstructor,
  Metadata,
  type ChannelCredentials,
  type ChannelOptions,
} from '@grpc/grpc-js';
import { DisposableStack, DisposableSymbols } from '@whatwg-node/disposablestack';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { decodeMessage, encodeMessage } from './protobuf/codec.js';
import {
  buildRpcPath,
  httpProtobufUnary,
  isHttpLocation,
  resolveHttpUrl,
} from './protobuf/dial.js';
import { parseMapping } from './protobuf/mapping.js';
import { buildGrpcMetadata, toGrpcGraphQLError } from './utils.js';

type ResolveReferenceFn = (
  reference: Record<string, any>,
  context: any,
  info: GraphQLResolveInfo,
) => any;

function setTypeResolveReference(
  type: { extensions?: any; name: string },
  resolveReference: ResolveReferenceFn,
) {
  const extensions: Record<string, any> = (type.extensions ||= {});
  const apollo: Record<string, any> = (extensions.apollo ||= {});
  const subgraph: Record<string, any> = (apollo.subgraph ||= {});
  subgraph.resolveReference = resolveReference;
  (type as any).resolveReference = resolveReference;
}

function getTypeResolveReference(type: { extensions?: any }): ResolveReferenceFn | undefined {
  const fromExtensions = (type.extensions as any)?.apollo?.subgraph?.resolveReference;
  if (typeof fromExtensions === 'function') {
    return fromExtensions;
  }
  const fromType = (type as any).resolveReference;
  return typeof fromType === 'function' ? fromType : undefined;
}

export interface ProtobufTransportOptions {
  requestTimeout?: number;
  credentialsSsl?: {
    rootCA?: string;
    certChain?: string;
    privateKey?: string;
  };
  useHTTPS?: boolean;
  metaData?:
    | {
        [k: string]: any;
      }
    | [string, string][];
  channelOptions?: ChannelOptions | [string, string | number][];
  headers?: Record<string, string> | [string, string][];
}

export class ProtobufTransportHelper extends DisposableStack {
  private channelCreds: ChannelCredentials | undefined;
  private fetchFn: MeshFetch = defaultFetch;

  constructor(
    private subgraphName: string,
    private baseDir: string,
    private log: Logger,
    private endpoint: string,
    private config: ProtobufTransportOptions,
  ) {
    super();
  }

  setFetch(fetchFn: MeshFetch | undefined) {
    this.fetchFn = fetchFn || defaultFetch;
  }

  getCredentials(): MaybePromise<ChannelCredentials> {
    if (this.config.credentialsSsl) {
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
      if (this.config.credentialsSsl.rootCA && this.config.credentialsSsl.rootCA !== 'rootCA') {
        const absoluteRootCAPath = path.isAbsolute(this.config.credentialsSsl.rootCA)
          ? this.config.credentialsSsl.rootCA
          : path.join(this.baseDir, this.config.credentialsSsl.rootCA);
        sslFiles.unshift(fs.promises.readFile(absoluteRootCAPath));
      }
      return Promise.all(sslFiles).then(([rootCA, privateKey, certChain]) =>
        credentials.createSsl(rootCA, privateKey, certChain),
      );
    }
    if (this.config.useHTTPS) {
      return credentials.createSsl();
    }
    return credentials.createInsecure();
  }

  processDirectives({ schema, creds }: { schema: GraphQLSchema; creds: ChannelCredentials }) {
    this.channelCreds = creds;
    const location = stringInterpolator.parse(this.endpoint, { env: process.env }) ?? this.endpoint;
    const channelOptions = Array.isArray(this.config.channelOptions)
      ? Object.fromEntries(this.config.channelOptions)
      : this.config.channelOptions;

    const queryType = schema.getQueryType();
    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type) || type.name.startsWith('__')) {
        continue;
      }
      const typeName = type.name;
      // Type-level `@protobuf__rpc` → resolveReference (entity fill / `$this` binds).
      const typeDirectives = getDirectives(schema, type) || [];
      for (const directiveObj of typeDirectives) {
        if (
          this.subgraphName &&
          directiveObj.args?.subgraph &&
          directiveObj.args.subgraph !== this.subgraphName
        ) {
          continue;
        }
        if (directiveObj.name !== 'protobuf__rpc' && directiveObj.name !== 'protobufRpc') {
          continue;
        }
        const resolver = this.createRpcResolverFromDirectiveArgs(
          directiveObj.args,
          location,
          channelOptions,
          typeName,
        );
        setTypeResolveReference(type, (reference, context, info) =>
          resolver(reference, {}, context, info),
        );
      }

      for (const field of Object.values(type.getFields())) {
        const directives = getDirectives(schema, field) || [];
        for (const directiveObj of directives) {
          if (
            this.subgraphName &&
            directiveObj.args?.subgraph &&
            directiveObj.args.subgraph !== this.subgraphName
          ) {
            continue;
          }
          if (directiveObj.name !== 'protobuf__rpc' && directiveObj.name !== 'protobufRpc') {
            continue;
          }
          const isEntity = !!(directiveObj.args as { entity?: boolean })?.entity;
          const resolver = this.createRpcResolverFromDirectiveArgs(
            directiveObj.args,
            location,
            channelOptions,
            typeName,
          );
          // Subscriptions use `subscribe` (async iterable). Query/Mutation server-stream
          // fields keep `resolve` and return an AsyncIterable so `@stream` can
          // incremental-deliver as gRPC chunks arrive (same pattern as legacy gRPC).
          if (typeName === 'Subscription') {
            field.subscribe = resolver;
            field.resolve = (x: any) => x;
          } else {
            field.resolve = resolver;
          }
          // Query `@protobuf__rpc(entity: true)` → type.resolveReference for Hive `_entities`.
          if (isEntity && type === queryType && isObjectType(getNamedType(field.type))) {
            const returnType = getNamedType(field.type) as GraphQLObjectType;
            if (!getTypeResolveReference(returnType)) {
              const entityField = field as GraphQLField<any, any>;
              setTypeResolveReference(returnType, (reference, context, info) => {
                const args: Record<string, any> = {};
                for (const arg of entityField.args) {
                  args[arg.name] = reference?.[arg.name];
                }
                return entityField.resolve?.(null, args, context, info);
              });
            }
          }
        }
      }
    }
    ensureFederationEntitiesField(schema);
  }

  private createRpcResolverFromDirectiveArgs(
    directiveArgs: any,
    location: string,
    channelOptions: Record<string, string | number> | undefined,
    typeName: string,
  ): GraphQLFieldResolver<any, any> {
    const {
      service,
      method,
      args: argsMapping,
      selection,
      stream: isStream,
    } = directiveArgs as {
      service?: string;
      method: string;
      args: string;
      selection: string;
      stream?: boolean;
    };
    return this.createRpcResolver({
      location,
      service,
      method,
      argsFields: parseMapping(argsMapping),
      selectionFields: parseMapping(selection),
      isStream: !!isStream,
      channelOptions,
      typeName,
    });
  }

  private createRpcResolver({
    location,
    service,
    method,
    argsFields,
    selectionFields,
    isStream,
    channelOptions,
    typeName,
  }: {
    location: string;
    service?: string;
    method: string;
    argsFields: ReturnType<typeof parseMapping>;
    selectionFields: ReturnType<typeof parseMapping>;
    isStream: boolean;
    channelOptions?: Record<string, string | number>;
    typeName: string;
  }): GraphQLFieldResolver<any, any> {
    const metaData = this.config.metaData;
    const headersConfig = this.config.headers;
    const timeout = this.config.requestTimeout;
    const creds = this.channelCreds ?? credentials.createInsecure();
    const http = isHttpLocation(location);
    const rpcPath = buildRpcPath(service, method);
    const transportFetch = this.fetchFn;

    return async function protobufRpcResolver(_root, args, context, info) {
      if (isStream && http) {
        throw new GraphQLError(
          'Server streaming protobuf RPCs require a gRPC location (not HTTP Connect/Twirp)',
        );
      }
      // Type-level entity resolvers pass the representation as `_root` and empty args;
      // `$this.*` binds read from that root.
      const thisRoot =
        _root != null && typeof _root === 'object' ? (_root as Record<string, any>) : undefined;
      const requestBytes = encodeMessage(argsFields, args ?? {}, args ?? {}, thisRoot);
      try {
        if (http) {
          const url = resolveHttpUrl(location, service, method);
          const headers: Record<string, string> = {};
          const rawHeaders = Array.isArray(headersConfig)
            ? Object.fromEntries(headersConfig)
            : headersConfig;
          if (rawHeaders) {
            for (const [k, v] of Object.entries(rawHeaders)) {
              headers[k] = stringInterpolator.parse(String(v), {
                args,
                context,
                env: process.env,
              });
            }
          }
          const ctrl = timeout ? AbortSignal.timeout(timeout) : undefined;
          const fetchFn: MeshFetch = context?.fetch || transportFetch || defaultFetch;
          const responseBytes = await httpProtobufUnary({
            url,
            body: requestBytes,
            headers,
            signal: ctrl,
            fetchFn,
            context,
            info,
          });
          return decodeMessage(selectionFields, responseBytes);
        }

        // gRPC unary (streaming: use generic client stream — unary first for Subscription via repeated unary not supported; use client streaming API)
        const metadata =
          buildGrpcMetadata(metaData, {
            root: thisRoot ?? {},
            args,
            context,
            env: process.env,
          }) ?? new Metadata();

        if (isStream || typeName === 'Subscription') {
          // Return AsyncIterable for both Subscription and Query `@stream` list fields.
          // Materializing into an array first corrupted repeated fields under `@stream`
          // incremental delivery (e.g. duplicated `cast` across chunks).
          return (async function* () {
            for await (const chunk of grpcServerStream({
              location,
              path: rpcPath,
              request: requestBytes,
              creds,
              metadata,
              channelOptions,
            })) {
              yield decodeMessage(selectionFields, chunk);
            }
          })();
        }

        const responseBytes = await grpcUnary({
          location,
          path: rpcPath,
          request: requestBytes,
          creds,
          metadata,
          channelOptions,
          timeout,
        });
        return decodeMessage(selectionFields, responseBytes);
      } catch (err) {
        throw toGrpcGraphQLError(err);
      }
    };
  }
}

function ensureFederationEntitiesField(schema: GraphQLSchema) {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return;
  }
  const queryFields = queryType.getFields();
  const entityTypes = Object.values(schema.getTypeMap()).filter(
    (t): t is GraphQLObjectType =>
      isObjectType(t) && !t.name.startsWith('__') && !!getTypeResolveReference(t),
  );
  if (!entityTypes.length) {
    return;
  }

  const typeMap = schema.getTypeMap() as Record<string, any>;
  let anyType = typeMap._Any as GraphQLScalarType | undefined;
  if (!anyType) {
    anyType = new GraphQLScalarType({
      name: '_Any',
      serialize: value => value,
      parseValue: value => value,
    });
    typeMap._Any = anyType;
  }

  let entityUnion = typeMap._Entity as GraphQLUnionType | undefined;
  if (!entityUnion) {
    entityUnion = new GraphQLUnionType({
      name: '_Entity',
      types: entityTypes,
      resolveType(obj) {
        return obj?.__typename || undefined;
      },
    });
    typeMap._Entity = entityUnion;
  }

  const entitiesResolve = (
    _root: unknown,
    args: { representations?: unknown },
    context: any,
    info: GraphQLResolveInfo,
  ) => {
    const representations = args?.representations;
    if (!Array.isArray(representations)) {
      return [];
    }
    return entitiesResolver({ representations, context, info });
  };

  if (queryFields._entities) {
    queryFields._entities.resolve = entitiesResolve;
    return;
  }

  queryFields._entities = {
    name: '_entities',
    description: 'Federation entity resolver for protobuf RPC transport (Hive `_entities` path)',
    type: new GraphQLNonNull(new GraphQLList(entityUnion)),
    args: [
      {
        name: 'representations',
        description: undefined,
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(anyType))),
        defaultValue: undefined,
        deprecationReason: undefined,
        extensions: {},
        astNode: undefined,
      },
    ],
    resolve: entitiesResolve,
    subscribe: undefined,
    deprecationReason: undefined,
    extensions: {},
    astNode: undefined,
  } as GraphQLField<any, any>;
}

function grpcUnary(opts: {
  location: string;
  path: string;
  request: Uint8Array;
  creds: ChannelCredentials;
  metadata: Metadata;
  channelOptions?: Record<string, string | number>;
  timeout?: number;
}): Promise<Uint8Array> {
  const Client = makeGenericClientConstructor(
    {
      Invoke: {
        path: opts.path,
        requestStream: false,
        responseStream: false,
        requestSerialize: (v: Uint8Array) => Buffer.from(v),
        requestDeserialize: (v: Buffer) => new Uint8Array(v),
        responseSerialize: (v: Uint8Array) => Buffer.from(v),
        responseDeserialize: (v: Buffer) => new Uint8Array(v),
      },
    },
    'MeshProtobuf',
  );
  const client = new Client(opts.location, opts.creds, opts.channelOptions);
  return new Promise((resolve, reject) => {
    const deadline =
      opts.timeout != null && opts.timeout > 0 ? new Date(Date.now() + opts.timeout) : undefined;
    (client as any).Invoke(
      opts.request,
      opts.metadata,
      deadline ? { deadline } : {},
      (err: Error | null, value?: Uint8Array) => {
        try {
          (client as any).close?.();
        } catch {
          // ignore
        }
        if (err) reject(err);
        else resolve(value ?? new Uint8Array());
      },
    );
  });
}

async function* grpcServerStream(opts: {
  location: string;
  path: string;
  request: Uint8Array;
  creds: ChannelCredentials;
  metadata: Metadata;
  channelOptions?: Record<string, string | number>;
}): AsyncGenerator<Uint8Array> {
  const Client = makeGenericClientConstructor(
    {
      Invoke: {
        path: opts.path,
        requestStream: false,
        responseStream: true,
        requestSerialize: (v: Uint8Array) => Buffer.from(v),
        requestDeserialize: (v: Buffer) => new Uint8Array(v),
        responseSerialize: (v: Uint8Array) => Buffer.from(v),
        responseDeserialize: (v: Buffer) => new Uint8Array(v),
      },
    },
    'MeshProtobuf',
  );
  const client = new Client(opts.location, opts.creds, opts.channelOptions);
  const call = (client as any).Invoke(opts.request, opts.metadata);
  try {
    for await (const chunk of call) {
      yield chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    }
  } finally {
    try {
      (client as any).close?.();
    } catch {
      // ignore
    }
  }
}

function mergeTransportHeaders(
  entryHeaders: [string, string][] | undefined,
  optionHeaders: ProtobufTransportOptions['headers'],
): Record<string, string> | [string, string][] | undefined {
  const fromEntry = entryHeaders?.length ? Object.fromEntries(entryHeaders) : undefined;
  const fromOptions = Array.isArray(optionHeaders)
    ? Object.fromEntries(optionHeaders)
    : optionHeaders;
  if (!fromEntry && !fromOptions) return undefined;
  return { ...fromEntry, ...fromOptions };
}

const transport: Transport<ProtobufTransportOptions> = {
  getSubgraphExecutor({ transportEntry, subgraph, cwd, log, fetch }) {
    const options = transportEntry.options || {};
    const helper = new ProtobufTransportHelper(
      transportEntry.subgraph,
      cwd,
      log,
      transportEntry.location,
      {
        ...options,
        headers: mergeTransportHeaders(transportEntry.headers, options.headers),
      },
    );
    helper.setFetch(fetch);
    return handleMaybePromise(
      () =>
        isHttpLocation(transportEntry.location)
          ? credentials.createInsecure()
          : helper.getCredentials(),
      creds => {
        helper.processDirectives({ schema: subgraph, creds });
        const executor = createDefaultExecutor(subgraph);
        executor[DisposableSymbols.dispose] = () => helper.dispose();
        return executor;
      },
    );
  },
};

export default transport;
