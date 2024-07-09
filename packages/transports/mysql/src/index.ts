import type { Transport } from '@graphql-mesh/transport-common';
import { getMySQLExecutor } from './execution.js';

export * from './execution.js';
export * from './parseEndpointUri.js';
export * from './types.js';

export default {
  getSubgraphExecutor({ subgraph }) {
    return getMySQLExecutor({
      subgraph,
    });
  },
} satisfies Transport<'mysql'>;
