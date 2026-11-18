import type { MeshFetch } from '@graphql-mesh/types';
import type { GraphQLThriftLoaderOptions } from './schema.js';
import { loadNonExecutableGraphQLSchemaFromIDL } from './schema.js';

/**
 * Mesh compose helper: load a `.thrift` IDL and emit a Thrift subgraph
 * (`@thrift__rpc` + `@transport(kind: "thrift")`, or TJSON `@connect` when
 * `protocol: 'json'`).
 *
 * @example
 * ```ts
 * import { loadThriftSubgraph } from '@omnigraph/thrift';
 *
 * const calculator = loadThriftSubgraph('calculator', {
 *   source: './calculator.thrift',
 *   endpoint: 'http://localhost:8080/thrift',
 *   serviceName: 'Calculator',
 *   protocol: 'binary',
 * });
 * ```
 * @example
 * ```ts
 * loadThriftSubgraph('twitter', {
 *   source: './twitter.thrift',
 *   endpoint: 'http://localhost:4000/thrift',
 *   entityMethods: ['getTweet'],
 *   ignoreErrorResponses: false,
 * })
 * ```
 *
 * @param name Subgraph name (also used as default `@thrift__rpc(subgraph:)`).
 * @param options Loader options - see {@link GraphQLThriftLoaderOptions}.
 */
export function loadThriftSubgraph(
  name: string,
  options: Omit<GraphQLThriftLoaderOptions, 'subgraphName'>,
) {
  return ({ cwd, fetch }: { cwd: string; fetch: MeshFetch }) => ({
    name,
    schema$: loadNonExecutableGraphQLSchemaFromIDL({
      fetchFn: fetch,
      baseDir: cwd,
      subgraphName: name,
      ...options,
    }),
  });
}

export { loadNonExecutableGraphQLSchemaFromIDL };
export type { GraphQLThriftLoaderOptions, ThriftRpcDirectiveArgs } from './schema.js';
export { thriftRpcDirective, ThriftMessageTypeEnum } from './schema.js';
export type { ThriftProtocol } from './mapping.js';

export { getThriftExecutor } from '@graphql-mesh/transport-thrift';
