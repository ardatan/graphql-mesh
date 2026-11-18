import type { Transport } from '@graphql-mesh/transport-common';
import { getMongoExecutor } from './execution.js';
import type { MongoTransportOptions } from './types.js';

export * from './client.js';
export * from './execution.js';
export * from './filter.js';
export * from './mapping.js';
export type * from './types.js';

export default {
  getSubgraphExecutor({ subgraph, cwd }) {
    return getMongoExecutor({
      subgraph,
      cwd,
    });
  },
} satisfies Transport<MongoTransportOptions>;
