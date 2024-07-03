import type { TransportGetSubgraphExecutor } from '@graphql-mesh/transport-common';
import { getNeo4JExecutor } from './executor.js';

export * from './auth.js';
export * from './driver.js';
export * from './eventEmitterForPubSub.js';
export * from './executor.js';

export const getSubgraphExecutor: TransportGetSubgraphExecutor<'neo4j', never> =
  function getNeo4JSubgraphExecutor({ subgraph, pubsub, logger }) {
    return getNeo4JExecutor({
      schema: subgraph,
      pubsub,
      logger,
    });
  };
