import type { Logger, MeshFetch } from '@graphql-mesh/types';
import { loadNonExecutableGraphQLSchemaFromOpenAPI } from './loadGraphQLSchemaFromOpenAPI.js';
import type { OpenAPILoaderOptions } from './types.js';

export { loadGraphQLSchemaFromOpenAPI as default } from './loadGraphQLSchemaFromOpenAPI.js';
export * from './loadGraphQLSchemaFromOpenAPI.js';
export { getJSONSchemaOptionsFromOpenAPIOptions } from './getJSONSchemaOptionsFromOpenAPIOptions.js';
export type { OpenAPILoaderOptions } from './types.js';

export function loadOpenAPISubgraph(name: string, options: OpenAPILoaderOptions) {
  return (ctx: { fetch: MeshFetch; cwd: string; logger: Logger }) => ({
    name,
    schema$: loadNonExecutableGraphQLSchemaFromOpenAPI(name, {
      ...options,
      fetch: ctx.fetch,
      cwd: ctx.cwd,
      logger: ctx.logger,
    }),
  });
}

export { processDirectives, getSubgraphExecutor } from '@omnigraph/json-schema';
