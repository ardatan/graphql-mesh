import type { Logger, MeshFetch } from '@graphql-mesh/types';
import { loadGraphQLSchemaFromRAML } from './loadGraphQLSchemaFromRAML.js';
import type { RAMLLoaderOptions } from './types.js';

export { loadGraphQLSchemaFromRAML as default } from './loadGraphQLSchemaFromRAML.js';
export * from './loadGraphQLSchemaFromRAML.js';
export { getJSONSchemaOptionsFromRAMLOptions } from './getJSONSchemaOptionsFromRAMLOptions.js';
export type { RAMLLoaderOptions } from './types.js';

export function loadRAMLSubgraph(name: string, options: RAMLLoaderOptions) {
  return (ctx: { fetch: MeshFetch; cwd: string; logger: Logger }) => ({
    name,
    schema$: loadGraphQLSchemaFromRAML(name, {
      ...options,
      fetch: ctx.fetch,
      cwd: ctx.cwd,
      logger: ctx.logger,
    }),
  });
}

export { processDirectives, getSubgraphExecutor } from '@omnigraph/json-schema';
