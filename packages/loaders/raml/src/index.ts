import { MeshFetch } from '@graphql-mesh/types';
import { loadGraphQLSchemaFromRAML } from './loadGraphQLSchemaFromRAML.js';
import { RAMLLoaderOptions } from './types.js';

export { loadGraphQLSchemaFromRAML as default } from './loadGraphQLSchemaFromRAML.js';
export * from './loadGraphQLSchemaFromRAML.js';
export { getJSONSchemaOptionsFromRAMLOptions } from './getJSONSchemaOptionsFromRAMLOptions.js';
export { RAMLLoaderOptions } from './types.js';

export function loadRAMLSubgraph(name: string, options: RAMLLoaderOptions) {
  return (ctx: { fetch: MeshFetch; cwd: string }) => ({
    name,
    schema$: loadGraphQLSchemaFromRAML(name, {
      ...options,
      fetch: ctx.fetch,
      cwd: ctx.cwd,
    }),
  });
}

export { processDirectives, getSubgraphExecutor } from '@omnigraph/json-schema';
