import type { Transport } from '@graphql-mesh/transport-common';
import {
  assertSupportedMeshSpecOnSchema,
  MESH_SUPPORTED_SPEC_VERSIONS,
} from '@graphql-mesh/utils';
import { getSqlExecutor } from './execution.js';
import type { SqlTransportOptions } from './types.js';

export * from './adapter.js';
export * from './batch.js';
export * from './client.js';
export * from './entity.js';
export * from './execution.js';
export * from './mapping.js';
export * from './plan.js';
export * from './relation-filters.js';
export * from './sql-builder.js';
export * from './through.js';
export * from './uri.js';
export type * from './types.js';
// pg-executor / pg-registry / pg-plans stay internal: they pull grafast +
// @dataplan/pg, which register process-lifetime state that fails Jest --detectLeaks.

export default {
  getSubgraphExecutor({ subgraph, cwd }) {
    assertSupportedMeshSpecOnSchema(subgraph, {
      name: 'sql',
      supportedVersions: MESH_SUPPORTED_SPEC_VERSIONS,
      required: false, // unified-graph extract may omit @link; validate version when present
      consumer: '@graphql-mesh/transport-sql',
    });
    return getSqlExecutor({
      subgraph,
      cwd,
    });
  },
} satisfies Transport<SqlTransportOptions>;
