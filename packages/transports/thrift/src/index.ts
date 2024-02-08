import { TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import { getThriftExecutor } from './execution';

export const getSubgraphExecutor: TransportExecutorFactoryFn<'thrift', never> =
  function getThriftSubgraphExecutor({ getSubgraph }) {
    return getThriftExecutor(getSubgraph());
  };

export { getThriftExecutor };
