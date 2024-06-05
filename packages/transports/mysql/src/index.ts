import { TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import { getMySQLExecutor } from './execution.js';

export * from './types.js';
export * from './execution.js';
export * from './parseEndpointUri.js';

export const getSubgraphExecutor: TransportExecutorFactoryFn<'mysql', never> =
  function getMySQLSubgraphExecutor({ subgraph, logger }) {
    return getMySQLExecutor({
      subgraph,
      logger,
    });
  };
