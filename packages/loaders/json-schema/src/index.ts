import { type Logger } from '@graphql-hive/logger';
import type { TransportGetSubgraphExecutor } from '@graphql-mesh/transport-common';
import transportConnector, {
  type ConnectorTransportOptions,
} from '@graphql-mesh/transport-connector';
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

export { processDirectives } from '@graphql-mesh/transport-connector';

export const getSubgraphExecutor: TransportGetSubgraphExecutor<
  ConnectorTransportOptions
> = opts => {
  return transportConnector.getSubgraphExecutor(opts);
};
