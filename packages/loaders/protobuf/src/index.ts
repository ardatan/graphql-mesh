import { type Logger } from '@graphql-hive/logger';
import type { YamlConfig } from '@graphql-mesh/types';
import { GrpcLoaderHelper } from './grpcLoaderHelper.js';

interface LoaderContext {
  cwd: string;
  log: Logger;
}

/**
 * RPC stack for {@link ProtobufLoaderOptions.type}.
 * Same `.proto` parse for all; day-one emit targets `grpc`. Connect/Twirp HTTP
 * dial works today via an HTTPS `@transport(location)` on hand-authored SDL.
 */
export type ProtobufSourceType = 'grpc' | 'connect' | 'twirp';

/**
 * Options for {@link loadProtobufSubgraph}.
 * Extends the Mesh gRPC handler shape (`endpoint`, `source`, TLS, metadata, ...);
 * pool / channel fields that matter at runtime are also forwarded onto
 * `@transport(kind: "protobuf", options:)`.
 *
 * @example
 * ```ts
 * import { loadProtobufSubgraph } from '@omnigraph/protobuf';
 *
 * loadProtobufSubgraph('movies', {
 *   type: 'grpc',
 *   endpoint: 'localhost:50051',
 *   source: {
 *     file: './proto/service.proto',
 *     load: { defaults: true },
 *   },
 * });
 * ```
 * @example
 * ```ts
 * // Schema via gRPC server reflection (no local `.proto`)
 * loadProtobufSubgraph('movies', {
 *   endpoint: 'localhost:50051',
 *   reflectionMetadata: { authorization: 'Bearer ...' },
 * })
 * ```
 * @example
 * ```ts
 * loadProtobufSubgraph('movies', {
 *   endpoint: 'movies.example.com:443',
 *   useHTTPS: true,
 *   credentialsSsl: {
 *     rootCA: './certs/ca.pem',
 *     certChain: './certs/client.crt',
 *     privateKey: './certs/client.key',
 *   },
 *   requestTimeout: 30_000,
 *   metaData: { 'x-tenant': '{context.headers.x-tenant}' },
 * })
 * ```
 */
export interface ProtobufLoaderOptions extends YamlConfig.GrpcHandler {
  /**
   * RPC stack for emit / dial conventions. Same `.proto` parse for all values.
   * Day one: `grpc`. Connect/Twirp loader emit can follow; hand-authored SDL
   * already works over HTTPS locations.
   */
  type?: ProtobufSourceType;
  /**
   * gRPC host:port (or URI) - becomes `@transport(location)`.
   *
   * @example 'localhost:50051'
   */
  endpoint: string;
  /**
   * Local / remote `.proto`, descriptor set path, or `{ file, load }` with include dirs.
   * Omit (or empty) to load the schema via gRPC server reflection.
   *
   * @example { file: './proto/service.proto', load: { includeDirs: ['./proto'], defaults: true } }
   */
  source?: YamlConfig.GrpcHandler['source'];
  /**
   * Unary / client-stream deadline in milliseconds.
   * Forwarded to `@transport(options.requestTimeout)`.
   * When omitted, the protobuf transport applies `200000`.
   *
   * @default 200000
   * @example 5_000
   */
  requestTimeout?: number;
  /**
   * TLS materials for the gRPC channel (paths resolved relative to the compose cwd).
   * When set, takes precedence over {@link ProtobufLoaderOptions.useHTTPS}:
   * - `rootCA` alone = custom trust store (no client certificate)
   * - client auth needs both `privateKey` and `certChain` (optional `rootCA` alongside)
   * Forwarded onto `@transport(options.credentialsSsl)`. When neither
   * `credentialsSsl` nor `useHTTPS` is set, the channel is insecure.
   *
   * @example { rootCA: './certs/ca.pem', certChain: './certs/client.crt', privateKey: './certs/client.key' }
   */
  credentialsSsl?: YamlConfig.GrpcCredentialsSsl;
  /**
   * Use TLS without custom cert files (`credentials.createSsl()`).
   * Ignored when `credentialsSsl` is set. When both `credentialsSsl` and
   * `useHTTPS` are omitted, the channel uses an insecure dial.
   */
  useHTTPS?: boolean;
  /**
   * Per-RPC gRPC metadata forwarded onto `@transport(options.metaData)`.
   * String values may use Mesh `{context.*}` / `{env.*}` interpolation.
   *
   * @example { authorization: 'Bearer {context.headers.authorization}' }
   */
  metaData?: YamlConfig.GrpcHandler['metaData'];
  /**
   * Method-name prefixes treated as GraphQL Query. gRPC methods whose names
   * start with one of these prefixes (case-insensitive) land on Query; other
   * methods land on Mutation unless overridden by `selectQueryOrMutationField`.
   *
   * @default ['get', 'list', 'search']
   * @example ['fetch', 'load']
   */
  prefixQueryMethod?: string[];
  /**
   * Force Query vs Mutation for matching gRPC method / GraphQL field names,
   * overriding the `prefixQueryMethod` heuristic for those entries.
   *
   * @example [{ type: 'query', fieldName: 'FetchMovies' }]
   */
  selectQueryOrMutationField?: YamlConfig.SelectQueryOrMutationFieldConfig[];
  /**
   * HTTP headers when `source` points at a remote `.proto` / SDL / descriptor
   * URL (compose-time fetch only).
   *
   * @example { Authorization: 'Bearer ...' }
   */
  schemaHeaders?: YamlConfig.GrpcHandler['schemaHeaders'];
  /**
   * Metadata sent with gRPC server-reflection requests when there is no local
   * `source` (schema loaded via reflection). Distinct from runtime `metaData`.
   *
   * @example { authorization: 'Bearer ...' }
   */
  reflectionMetadata?: YamlConfig.GrpcHandler['reflectionMetadata'];
  /**
   * Channel options for `@grpc/grpc-js` (message size, keepalive, ...).
   * Forwarded onto `@transport(options.channelOptions)` (often as entry pairs
   * for SDL-safe keys like `grpc.max_receive_message_length`).
   *
   * @example { 'grpc.max_receive_message_length': 20_000_000 }
   */
  channelOptions?: YamlConfig.GrpcHandler['channelOptions'];
}

/**
 * Mesh compose helper: load `.proto` / reflection and emit a protobuf-RPC subgraph
 * with `@protobuf__rpc` + `@transport(kind: "protobuf")`.
 *
 * @example
 * ```ts
 * import { loadProtobufSubgraph } from '@omnigraph/protobuf';
 *
 * const movies = loadProtobufSubgraph('movies', {
 *   type: 'grpc',
 *   endpoint: 'localhost:50051',
 *   source: './services/movies/proto/service.proto',
 * });
 * ```
 *
 * @param name Subgraph name (also used as default `@protobuf__rpc(subgraph:)`).
 * @param options Connection and emit options - see {@link ProtobufLoaderOptions}.
 */
export function loadProtobufSubgraph(name: string, options: ProtobufLoaderOptions) {
  return (ctx: LoaderContext) => {
    const helper = new GrpcLoaderHelper(name, ctx.cwd, ctx.log, {
      ...options,
      // type reserved for future connect/twirp emit path conventions
    });
    const schema$ = helper.buildSchema().finally(() => helper.dispose());
    return {
      name,
      schema$,
    };
  };
}

export type { ProtobufRpcDirectiveArgs } from './directives.js';
export { protobufRpcDirective, transportDirective } from './directives.js';
