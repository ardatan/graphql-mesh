import { createDefaultExecutor, TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import { ProcessDirectiveArgs, processDirectives } from './directives/process.js';

export interface RESTTransportOptions {
  timeout?: number;
  queryParams?: Record<string, string>;
}

export const getSubgraphExecutor: TransportExecutorFactoryFn<'rest', RESTTransportOptions> =
  function getRESTSubgraphExecutor({ transportEntry, getSubgraph, fetch, pubsub, logger }) {
    const preProcessedSchema = getSubgraph();
    const processDirectiveOpts: ProcessDirectiveArgs = {
      globalFetch: fetch,
      pubsub,
      logger,
      ...transportEntry.options,
    };
    const processedSchema = processDirectives(preProcessedSchema, processDirectiveOpts);
    const executor = createDefaultExecutor(processedSchema);
    return executor;
  };

export { processDirectives, ProcessDirectiveArgs } from './directives/process.js';
export { processScalarType } from './directives/scalars.js';
