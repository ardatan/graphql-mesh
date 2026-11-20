import { type Logger } from '@graphql-hive/logger';
import type { TransportGetSubgraphExecutor } from '@graphql-mesh/transport-common';
import transportConnect, { type ConnectTransportOptions } from '@graphql-mesh/transport-connect';
import type { MeshFetch } from '@graphql-mesh/types';
import {
  loadGraphQLSchemaFromJSONSchemas,
  loadNonExecutableGraphQLSchemaFromJSONSchemas,
} from './loadGraphQLSchemaFromJSONSchemas.js';
import type { JSONSchemaLoaderOptions } from './types.js';

export default loadGraphQLSchemaFromJSONSchemas;
export * from './loadGraphQLSchemaFromJSONSchemas.js';
export * from './getComposerFromJSONSchema.js';
export * from './getDereferencedJSONSchemaFromOperations.js';
export * from './getGraphQLSchemaFromDereferencedJSONSchema.js';
export {
  clearMeshEntityRegistries,
  getMeshEntityKeyFields,
  getMeshEntityRef,
  getMeshTypeConnect,
  isMeshEntityType,
  registerMeshEntityType,
  setMeshEntityRef,
  setMeshTypeConnect,
  type MeshTypeConnectArgs,
} from './entityRefs.js';
export type * from './types.js';
export { resolveScalarMap, type ScalarMapInput } from './resolveScalarMap.js';

/**
 * Mesh compose helper: build an `@connect` subgraph from JSON Schema operations.
 *
 * @example
 * ```ts
 * import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';
 *
 * const api = loadJSONSchemaSubgraph('api', {
 *   endpoint: 'https://api.example.com',
 *   operations: [
 *     {
 *       type: 'Query',
 *       field: 'user',
 *       path: '/users/{args.id}',
 *       method: 'GET',
 *       responseSchema: './user.json',
 *     },
 *   ],
 * });
 * ```
 *
 * @param name Subgraph name.
 * @param options See {@link JSONSchemaLoaderOptions}.
 */
export function loadJSONSchemaSubgraph(name: string, options: JSONSchemaLoaderOptions) {
  return (ctx: { fetch: MeshFetch; cwd: string; log: Logger }) => ({
    name,
    schema$: loadNonExecutableGraphQLSchemaFromJSONSchemas(name, {
      ...options,
      fetch: ctx.fetch,
      cwd: ctx.cwd,
      log: ctx.log,
    }),
  });
}

export { processDirectives } from '@graphql-mesh/transport-connect';

export const getSubgraphExecutor: TransportGetSubgraphExecutor<ConnectTransportOptions> = opts => {
  return transportConnect.getSubgraphExecutor(opts);
};
