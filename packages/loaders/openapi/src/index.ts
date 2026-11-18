import { type Logger } from '@graphql-hive/logger';
import type { MeshFetch } from '@graphql-mesh/types';
import { loadNonExecutableGraphQLSchemaFromOpenAPI } from './loadGraphQLSchemaFromOpenAPI.js';
import type { OpenAPILoaderOptions } from './types.js';

export { loadGraphQLSchemaFromOpenAPI as default } from './loadGraphQLSchemaFromOpenAPI.js';
export * from './loadGraphQLSchemaFromOpenAPI.js';
export { getJSONSchemaOptionsFromOpenAPIOptions } from './getJSONSchemaOptionsFromOpenAPIOptions.js';
export type { OpenAPILoaderOptions } from './types.js';

/**
 * Mesh compose helper: load an OpenAPI / Swagger document and emit an `@connect` subgraph.
 *
 * @example
 * ```ts
 * import { loadOpenAPISubgraph } from '@omnigraph/openapi';
 *
 * const petstore = loadOpenAPISubgraph('petstore', {
 *   source: './openapi.yaml',
 *   endpoint: 'https://petstore.example.com/api',
 * });
 * ```
 *
 * @param name Subgraph name.
 * @param options See {@link OpenAPILoaderOptions}.
 */
export function loadOpenAPISubgraph(name: string, options: OpenAPILoaderOptions) {
  return (ctx: { fetch: MeshFetch; cwd: string; log: Logger }) => ({
    name,
    schema$: loadNonExecutableGraphQLSchemaFromOpenAPI(name, {
      ...options,
      fetch: ctx.fetch,
      cwd: ctx.cwd,
      log: ctx.log,
    }),
  });
}

export { processDirectives, getSubgraphExecutor } from '@omnigraph/json-schema';
