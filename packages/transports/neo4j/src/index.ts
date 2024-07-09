import type { Transport } from '@graphql-mesh/transport-common';
import { getNeo4JExecutor } from './executor.js';

export * from './auth.js';
export * from './driver.js';
export * from './eventEmitterForPubSub.js';
export * from './executor.js';

export default {
  getSubgraphExecutor({ subgraph, pubsub, logger }) {
    return getNeo4JExecutor({
      schema: subgraph,
      pubsub,
      logger,
    });
  },
} satisfies Transport<'neo4j'>;
