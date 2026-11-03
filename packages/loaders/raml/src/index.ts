import type { MeshFetch } from '@graphql-mesh/types';
import { loadGraphQLSchemaFromRAML } from './loadGraphQLSchemaFromRAML.js';
import type { RAMLLoaderOptions } from './types.js';
import { Logger } from '@graphql-hive/logger';

export { loadGraphQLSchemaFromRAML as default } from './loadGraphQLSchemaFromRAML.js';
export * from './loadGraphQLSchemaFromRAML.js';
export { getJSONSchemaOptionsFromRAMLOptions } from './getJSONSchemaOptionsFromRAMLOptions.js';
export type { RAMLLoaderOptions } from './types.js';

export function loadRAMLSubgraph(name: string, options: RAMLLoaderOptions) {
  return (ctx: { fetch: MeshFetch; cwd: string; log: Logger }) => ({
    name,
    schema$: loadGraphQLSchemaFromRAML(name, {
      ...options,
      fetch: ctx.fetch,
      cwd: ctx.cwd, log: ctx.log,
    }),
  });
}

export { processDirectives, getSubgraphExecutor } from '@omnigraph/json-schema';
