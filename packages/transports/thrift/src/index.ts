import { TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import { getThriftExecutor } from './execution.js';

export const getSubgraphExecutor: TransportExecutorFactoryFn<'thrift', never> =
  function getThriftSubgraphExecutor({ subgraph }) {
    return getThriftExecutor(subgraph);
  };

export { getThriftExecutor };

export * from './types.js';
