import { MeshFetch } from '@graphql-mesh/types';
import {
  loadGraphQLSchemaFromJSONSchemas,
  loadNonExecutableGraphQLSchemaFromJSONSchemas,
} from './loadGraphQLSchemaFromJSONSchemas.js';
import { JSONSchemaLoaderOptions } from './types.js';

export default loadGraphQLSchemaFromJSONSchemas;
export * from './loadGraphQLSchemaFromJSONSchemas.js';
export * from './getComposerFromJSONSchema.js';
export * from './getDereferencedJSONSchemaFromOperations.js';
export * from './getGraphQLSchemaFromDereferencedJSONSchema.js';
export * from './types.js';

export function loadJSONSchemaSubgraph(name: string, options: JSONSchemaLoaderOptions) {
  return (ctx: { fetch: MeshFetch; cwd: string }) => ({
    name,
    schema$: loadNonExecutableGraphQLSchemaFromJSONSchemas(name, {
      ...options,
      fetch: ctx.fetch,
      cwd: ctx.cwd,
    }),
  });
}

export { getSubgraphExecutor, processDirectives } from '@graphql-mesh/transport-rest';
