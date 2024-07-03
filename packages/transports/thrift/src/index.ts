import type { TransportGetSubgraphExecutor } from '@graphql-mesh/transport-common';
import { getThriftExecutor } from './execution.js';

export const getSubgraphExecutor: TransportGetSubgraphExecutor<'thrift', never> =
  function getThriftSubgraphExecutor({ subgraph }) {
    return getThriftExecutor(subgraph);
  };

export { getThriftExecutor };

export * from './types.js';
