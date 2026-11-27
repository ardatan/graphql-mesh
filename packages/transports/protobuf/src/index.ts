import {
  getNamedType,
  GraphQLError,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLUnionType,
  isObjectType,
  type GraphQLField,
  type GraphQLFieldResolver,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import { entitiesResolver } from '@apollo/subgraph';
import type { Logger } from '@graphql-hive/logger';
import { fs, path, process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { createDefaultExecutor, type Transport } from '@graphql-mesh/transport-common';
import type { MeshFetch } from '@graphql-mesh/types';
import {
  assertSupportedMeshSpecOnSchema,
  installQueryField,
  MESH_SUPPORTED_SPEC_VERSIONS,
  validateMeshDirectives,
} from '@graphql-mesh/utils';
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
import { buildGrpcMetadata, mapGrpcStreamErrors, toGrpcGraphQLError } from './utils.js';

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

/**
 * Applied when `@transport(options.requestTimeout)` is omitted (ms).
 * Used for unary RPCs and Query/Mutation server streams; Subscription streams
 * omit the deadline.
 *
 * @default 200000
 */
export const DEFAULT_PROTOBUF_REQUEST_TIMEOUT_MS = 200_000;

/**
 * Connection / channel options stored on `@transport(kind: "protobuf", options:)`
 * (and accepted by the protobuf loader / transport entry).
 *
 * @example
 * ```ts
 * // Mesh compose - options land on `@transport(kind: "protobuf", options: ...)`
 * loadProtobufSubgraph('movies', {
 *   endpoint: 'movies.example.com:443',
 *   useHTTPS: true,
 *   requestTimeout: 30_000,
 *   metaData: { authorization: 'Bearer {context.token}' },
 *   channelOptions: { 'grpc.max_receive_message_length': 20_000_000 },
 * })
 * ```
 * @example
 * ```graphql
 * schema @transport(
 *   subgraph: "movies"
 *   kind: "protobuf"
 *   location: "localhost:50051"
 *   options: {
 *     requestTimeout: 30000
 *     metaData: [["authorization", "Bearer ..."]]
 *   }
 * ) {
 *   query: Query
 * }
 * ```
 */
export interface ProtobufTransportOptions {
  /**
   * RPC deadline in milliseconds for unary calls and for server-streaming
   * Query/Mutation fields. Long-lived Subscription streams omit this deadline
   * so they are not killed by a unary-style timeout.
   *
   * @default 200000
   * @example 5_000
   */
  requestTimeout?: number;
  /**
   * TLS materials for the gRPC channel (paths resolved relative to the transport cwd).
   * When set, takes precedence over {@link ProtobufTransportOptions.useHTTPS}:
   * - `rootCA` alone = custom trust store (no client certificate)
   * - client auth needs both `privateKey` and `certChain` (optional `rootCA` alongside)
   * When neither `credentialsSsl` nor `useHTTPS` is set, the channel is insecure
   * (`credentials.createInsecure()`).
   *
   * @example { rootCA: './certs/ca.pem', certChain: './certs/client.crt', privateKey: './certs/client.key' }
   */
  credentialsSsl?: {
    /**
     * PEM CA / trust bundle path. Alone = CA-only trust; with client certs,
     * optional custom root alongside `privateKey` + `certChain`.
     *
     * @example './certs/ca.pem'
     */
    rootCA?: string;
    /**
     * Client certificate chain path. Requires `privateKey` (and vice versa).
     *
     * @example './certs/client.crt'
     */
    certChain?: string;
    /**
     * Client private key path. Requires `certChain` (and vice versa).
     *
     * @example './certs/client.key'
     */
    privateKey?: string;
  };
  /**
   * Use TLS without custom cert files (`credentials.createSsl()`).
   * Ignored when `credentialsSsl` is set. When both `credentialsSsl` and
   * `useHTTPS` are omitted, the channel uses an insecure dial.
   */
  useHTTPS?: boolean;
  /**
   * Per-RPC gRPC metadata (record or `[[name, value], ...]`). String values may use
   * Mesh `{context.*}` / `{env.*}` interpolation.
   *
   * @example { 'x-tenant': '{context.headers.x-tenant}' }
   */
  metaData?:
    | {
        [k: string]: any;
      }
    | [string, string][];
  /**
   * Channel options for `@grpc/grpc-js` (object or entry pairs for SDL print).
   *
   * @example { 'grpc.max_receive_message_length': 20_000_000 }
   */
  channelOptions?: ChannelOptions | [string, string | number][];
  /**
   * Extra HTTP headers for HTTPS protobuf dial (`https://` transport locations).
   * Merged with `@transport(headers:)`.
   *
   * @example { 'content-type': 'application/proto' }
   */
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
      return loadSslCredentials(this.baseDir, this.config.credentialsSsl);
    }
    if (this.config.useHTTPS) {
      return credentials.createSsl();
    }
    return credentials.createInsecure();
  }

  processDirectives({
    schema,
    creds,
  }: {
    schema: GraphQLSchema;
    creds: ChannelCredentials;
  }): GraphQLSchema {
    this.channelCreds = creds;
    const location = stringInterpolator.parse(this.endpoint, { env: process.env }) ?? this.endpoint;
    const channelOptions = Array.isArray(this.config.channelOptions)
      ? Object.fromEntries(this.config.channelOptions)
      : this.config.channelOptions;

    const queryType = schema.getQueryType();
    const subscriptionType = schema.getSubscriptionType();
    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type) || type.name.startsWith('__')) {
        continue;
      }
      const typeName = type.name;
      const isSubscription = type === subscriptionType;
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
          isSubscription,
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
            isSubscription,
          );
          // Subscriptions use `subscribe` (async iterable). Query/Mutation server-stream
          // fields keep `resolve` and return an AsyncIterable so `@stream` can
          // incremental-deliver as gRPC chunks arrive (same pattern as legacy gRPC).
          if (isSubscription) {
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
                return entityField.resolve?.(reference, args, context, info);
              });
            }
          }
        }
      }
    }
    return ensureFederationEntitiesField(schema);
  }

  private createRpcResolverFromDirectiveArgs(
    directiveArgs: any,
    location: string,
    channelOptions: Record<string, string | number> | undefined,
    typeName: string,
    isSubscription: boolean,
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
      args?: string;
      selection: string;
      stream?: boolean;
    };
    if (method == null || method === '') {
      throw new GraphQLError(`@protobuf__rpc on ${typeName} is missing required non-empty method`);
    }
    if (selection == null) {
      throw new GraphQLError(`@protobuf__rpc on ${typeName} is missing required selection`);
    }
    return this.createRpcResolver({
      location,
      service,
      method,
      // Join finalize may drop empty-string `args`; treat missing as empty request.
      argsFields: parseMapping(argsMapping ?? ''),
      selectionFields: parseMapping(selection),
      isStream: !!isStream,
      channelOptions,
      typeName,
      isSubscription,
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
    isSubscription,
  }: {
    location: string;
    service?: string;
    method: string;
    argsFields: ReturnType<typeof parseMapping>;
    selectionFields: ReturnType<typeof parseMapping>;
    isStream: boolean;
    channelOptions?: Record<string, string | number>;
    typeName: string;
    isSubscription: boolean;
  }): GraphQLFieldResolver<any, any> {
    const metaData = this.config.metaData;
    const headersConfig = this.config.headers;
    const timeout = this.config.requestTimeout ?? DEFAULT_PROTOBUF_REQUEST_TIMEOUT_MS;
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
              // Lowercase so `Content-Type` replaces the dial default `content-type` key.
              headers[k.toLowerCase()] = stringInterpolator.parse(String(v), {
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

        // gRPC unary (streaming: use generic client stream - unary first for Subscription via repeated unary not supported; use client streaming API)
        const metadata =
          buildGrpcMetadata(metaData, {
            root: thisRoot ?? {},
            args,
            context,
            env: process.env,
          }) ?? new Metadata();

        if (isStream || isSubscription) {
          // Return AsyncIterable for both Subscription and Query `@stream` list fields.
          // Materializing into an array first corrupted repeated fields under `@stream`
          // incremental delivery (e.g. duplicated `cast` across chunks).
          // Apply requestTimeout as a per-call deadline for Query streams; long-lived
          // Subscriptions omit it so the stream is not killed by a unary-style timeout.
          const streamTimeout = isSubscription ? undefined : timeout;
          return (async function* () {
            for await (const chunk of mapGrpcStreamErrors(
              grpcServerStream({
                location,
                path: rpcPath,
                request: requestBytes,
                creds,
                metadata,
                channelOptions,
                timeout: streamTimeout,
              }),
            )) {
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

function ensureFederationEntitiesField(schema: GraphQLSchema): GraphQLSchema {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return schema;
  }
  const entityTypes = Object.values(schema.getTypeMap()).filter(
    (t): t is GraphQLObjectType =>
      isObjectType(t) && !t.name.startsWith('__') && !!getTypeResolveReference(t),
  );
  if (!entityTypes.length) {
    return schema;
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

  return installQueryField(schema, '_entities', {
    description: 'Federation entity resolver for protobuf RPC transport (Hive `_entities` path)',
    type: new GraphQLNonNull(new GraphQLList(entityUnion)),
    args: {
      representations: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(anyType))),
        // GraphQL 17 requires `default`; GraphQL 16 only knows `defaultValue`.
        default: undefined,
        extensions: Object.create(null),
      } as any,
    },
    resolve: entitiesResolve,
    extensions: Object.create(null),
  });
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
  timeout?: number;
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
  const deadline =
    opts.timeout != null && opts.timeout > 0 ? new Date(Date.now() + opts.timeout) : undefined;
  const call = deadline
    ? (client as any).Invoke(opts.request, opts.metadata, { deadline })
    : (client as any).Invoke(opts.request, opts.metadata);
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

async function loadSslCredentials(
  baseDir: string,
  ssl: NonNullable<ProtobufTransportOptions['credentialsSsl']>,
): Promise<ChannelCredentials> {
  const resolvePath = (p: string) => (path.isAbsolute(p) ? p : path.join(baseDir, p));
  const rootCAPath = ssl.rootCA && ssl.rootCA !== 'rootCA' ? resolvePath(ssl.rootCA) : undefined;
  const privateKeyPath = ssl.privateKey ? resolvePath(ssl.privateKey) : undefined;
  const certChainPath = ssl.certChain ? resolvePath(ssl.certChain) : undefined;

  // CA-only (trust store) - no client cert.
  if (rootCAPath && !privateKeyPath && !certChainPath) {
    const rootCA = await fs.promises.readFile(rootCAPath);
    return credentials.createSsl(rootCA);
  }

  // Optional rootCA + required client key/cert when either privateKey or certChain is set.
  if (!privateKeyPath || !certChainPath) {
    throw new Error(
      'credentialsSsl requires both privateKey and certChain for client certificates, or only rootCA for CA-only trust',
    );
  }

  const [rootCA, privateKey, certChain] = await Promise.all([
    rootCAPath ? fs.promises.readFile(rootCAPath) : Promise.resolve(undefined),
    fs.promises.readFile(privateKeyPath),
    fs.promises.readFile(certChainPath),
  ]);
  // createSsl(rootCerts, privateKey, certChain) - pass undefined rootCerts when omitted
  // so privateKey/certChain stay in the correct argument slots.
  return credentials.createSsl(rootCA, privateKey, certChain);
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
    assertSupportedMeshSpecOnSchema(subgraph, {
      name: 'protobuf',
      supportedVersions: MESH_SUPPORTED_SPEC_VERSIONS,
      required: false, // unified-graph extract may omit @link; validate version when present
      consumer: '@graphql-mesh/transport-protobuf',
    });
    validateMeshDirectives(subgraph, {
      consumer: '@graphql-mesh/transport-protobuf',
      soft: true,
    });
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
        const schema = helper.processDirectives({ schema: subgraph, creds });
        const executor = createDefaultExecutor(schema);
        executor[DisposableSymbols.dispose] = () => helper.dispose();
        return executor;
      },
    );
  },
};

export default transport;
