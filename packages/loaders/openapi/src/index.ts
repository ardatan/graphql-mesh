import { MeshFetch } from '@graphql-mesh/types';
import { loadNonExecutableGraphQLSchemaFromOpenAPI } from './loadGraphQLSchemaFromOpenAPI.js';
import { OpenAPILoaderOptions } from './types.js';

export { loadGraphQLSchemaFromOpenAPI as default } from './loadGraphQLSchemaFromOpenAPI.js';
export * from './loadGraphQLSchemaFromOpenAPI.js';
export { getJSONSchemaOptionsFromOpenAPIOptions } from './getJSONSchemaOptionsFromOpenAPIOptions.js';
export { OpenAPILoaderOptions } from './types.js';

export function loadOpenAPISubgraph(name: string, options: OpenAPILoaderOptions) {
  return (ctx: { fetch: MeshFetch; cwd: string }) => ({
    name,
    schema$: loadNonExecutableGraphQLSchemaFromOpenAPI(name, {
      ...options,
      fetch: ctx.fetch,
      cwd: ctx.cwd,
    }),
  });
}

export { processDirectives, getSubgraphExecutor } from '@omnigraph/json-schema';
