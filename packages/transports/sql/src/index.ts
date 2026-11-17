import type { Transport } from '@graphql-mesh/transport-common';
import { getSqlExecutor } from './execution.js';
import type { SqlTransportOptions } from './types.js';

export * from './batch.js';
export * from './client.js';
export * from './adapter.js';
export * from './entity.js';
export * from './execution.js';
export * from './mapping.js';
export * from './sql-builder.js';
export * from './uri.js';
export type * from './types.js';

export default {
  getSubgraphExecutor({ subgraph, cwd }) {
    return getSqlExecutor({
      subgraph,
      cwd,
    });
  },
} satisfies Transport<SqlTransportOptions>;
