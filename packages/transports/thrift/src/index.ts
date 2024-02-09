import { TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import { getThriftExecutor } from './execution.js';

export const getSubgraphExecutor: TransportExecutorFactoryFn<'thrift', never> =
  function getThriftSubgraphExecutor({ getSubgraph }) {
    return getThriftExecutor(getSubgraph());
  };

export { getThriftExecutor };

export * from './types.js';
