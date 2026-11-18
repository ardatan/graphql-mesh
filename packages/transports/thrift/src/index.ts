import type { Transport } from '@graphql-mesh/transport-common';
import {
  assertSupportedMeshSpecOnSchema,
  MESH_SUPPORTED_SPEC_VERSIONS,
} from '@graphql-mesh/utils';
import { getThriftExecutor } from './execution.js';

export { getThriftExecutor };
export { createGraphQLThriftClient, type ThriftRpcBinding } from './client.js';

export type * from './types.js';

export default {
  getSubgraphExecutor({ subgraph }) {
    assertSupportedMeshSpecOnSchema(subgraph, {
      name: 'thrift',
      supportedVersions: MESH_SUPPORTED_SPEC_VERSIONS,
      required: false, // unified-graph extract may omit @link; validate version when present
      consumer: '@graphql-mesh/transport-thrift',
    });
    return getThriftExecutor(subgraph);
  },
} satisfies Transport;
