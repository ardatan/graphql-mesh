import type { Transport } from '@graphql-mesh/transport-common';
import {
  assertSupportedMeshSpecOnSchema,
  MESH_SUPPORTED_SPEC_VERSIONS,
} from '@graphql-mesh/utils';
import { getMongoExecutor } from './execution.js';
import type { MongoTransportOptions } from './types.js';

export * from './client.js';
export * from './execution.js';
export * from './filter.js';
export * from './mapping.js';
export type * from './types.js';

export default {
  getSubgraphExecutor({ subgraph, cwd }) {
    assertSupportedMeshSpecOnSchema(subgraph, {
      name: 'mongo',
      supportedVersions: MESH_SUPPORTED_SPEC_VERSIONS,
      required: false, // unified-graph extract may omit @link; validate version when present
      consumer: '@graphql-mesh/transport-mongo',
    });
    return getMongoExecutor({
      subgraph,
      cwd,
    });
  },
} satisfies Transport<MongoTransportOptions>;
