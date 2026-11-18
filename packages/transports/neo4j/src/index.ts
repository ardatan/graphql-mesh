import type { Transport } from '@graphql-mesh/transport-common';
import {
  assertSupportedMeshSpecOnSchema,
  MESH_SUPPORTED_SPEC_VERSIONS,
} from '@graphql-mesh/utils';
import { getNeo4JExecutor } from './executor.js';

export * from './auth.js';
export * from './directives.js';
export * from './driver.js';
export * from './eventEmitterForPubSub.js';
export * from './executor.js';

/**
 * Mesh transport entry for Neo4j subgraphs (`@transport(kind: "neo4j")`).
 *
 * Builds a disposable executor via {@link getNeo4JExecutor} using the composed subgraph
 * schema (endpoint / database / auth come from the transport directive written by the loader).
 */
export default {
  getSubgraphExecutor({ subgraph, pubsub, log }) {
    assertSupportedMeshSpecOnSchema(subgraph, {
      name: 'neo4j',
      supportedVersions: MESH_SUPPORTED_SPEC_VERSIONS,
      required: false, // unified-graph extract may omit @link; validate version when present
      consumer: '@graphql-mesh/transport-neo4j',
    });
    return getNeo4JExecutor({
      schema: subgraph,
      pubsub,
      log,
    });
  },
} satisfies Transport;
