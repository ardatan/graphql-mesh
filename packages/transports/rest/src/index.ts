import {
  createDefaultExecutor,
  type TransportGetSubgraphExecutor,
} from '@graphql-mesh/transport-common';
import { processDirectives, type ProcessDirectiveArgs } from './directives/process.js';

export interface RESTTransportOptions {
  timeout?: number;
  queryParams?: Record<string, string>;
}

export const getSubgraphExecutor: TransportGetSubgraphExecutor<'rest', RESTTransportOptions> =
  function getRESTSubgraphExecutor({ transportEntry, subgraph, fetch, pubsub, logger }) {
    const processDirectiveOpts: ProcessDirectiveArgs = {
      globalFetch: fetch,
      pubsub,
      logger,
      ...transportEntry.options,
    };
    const processedSchema = processDirectives(subgraph, processDirectiveOpts);
    const executor = createDefaultExecutor(processedSchema);
    return executor;
  };

export { processDirectives } from './directives/process.js';
export type { ProcessDirectiveArgs } from './directives/process.js';
export { processScalarType } from './directives/scalars.js';
