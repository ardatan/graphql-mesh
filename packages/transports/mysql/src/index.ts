import type { TransportGetSubgraphExecutor } from '@graphql-mesh/transport-common';
import { getMySQLExecutor } from './execution.js';

export * from './types.js';
export * from './execution.js';
export * from './parseEndpointUri.js';

export const getSubgraphExecutor: TransportGetSubgraphExecutor<'mysql', never> =
  function getMySQLSubgraphExecutor({ subgraph }) {
    return getMySQLExecutor({
      subgraph,
    });
  };
