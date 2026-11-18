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
 *
 * @example 'grpc'
 * @example 'connect'
 * @example 'twirp'
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
   *
   * @example 'grpc'
   */
  type?: ProtobufSourceType;
  /**
   * gRPC host:port (or URI) - becomes `@transport(location)`.
   *
   * @example 'localhost:50051'
   * @example 'movies.example.com:443'
   */
  endpoint: string;
  /**
   * Local / remote `.proto`, descriptor set path, or `{ file, load }` with include dirs.
   * Omit (or empty) to load the schema via gRPC server reflection.
   *
   * @example './proto/service.proto'
   * @example { file: './proto/service.proto', load: { includeDirs: ['./proto'], defaults: true } }
   */
  source?: YamlConfig.GrpcHandler['source'];
  /**
   * Unary / client-stream deadline in milliseconds (default `200000`).
   * Forwarded to `@transport(options.requestTimeout)`.
   *
   * @example 30_000
   */
  requestTimeout?: number;
  /**
   * TLS materials for the gRPC channel (`rootCA` alone, or client cert pair).
   * Paths are resolved relative to the compose cwd.
   *
   * @example { rootCA: './certs/ca.pem' }
   */
  credentialsSsl?: YamlConfig.GrpcCredentialsSsl;
  /**
   * Use TLS without custom cert files (`credentials.createSsl()`).
   *
   * @example true
   */
  useHTTPS?: boolean;
  /**
   * Per-RPC metadata (string values may use Mesh `{context.*}` / `{env.*}` interpolation).
   *
   * @example { authorization: 'Bearer {context.headers.authorization}' }
   */
  metaData?: YamlConfig.GrpcHandler['metaData'];
  /**
   * Method-name prefixes treated as GraphQL Query (default `get` / `list` / `search`).
   *
   * @example ['get', 'list', 'find']
   */
  prefixQueryMethod?: string[];
  /**
   * Force Query vs Mutation for matching gRPC method names.
   *
   * @example [{ type: 'query', fieldName: 'FetchMovies' }]
   */
  selectQueryOrMutationField?: YamlConfig.SelectQueryOrMutationFieldConfig[];
  /**
   * HTTP headers when `source` points at a remote SDL / descriptor URL.
   *
   * @example { Authorization: 'Bearer ...' }
   */
  schemaHeaders?: YamlConfig.GrpcHandler['schemaHeaders'];
  /**
   * Metadata sent with server-reflection requests (no local `source`).
   *
   * @example { authorization: 'Bearer ...' }
   */
  reflectionMetadata?: YamlConfig.GrpcHandler['reflectionMetadata'];
  /**
   * Channel options for `@grpc/grpc-js` (e.g. message size, keepalive).
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
