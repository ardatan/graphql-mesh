import { isAsyncIterable } from 'graphql-yoga';
import { defaultPrintFn } from '@graphql-mesh/transport-common';
import type { Logger } from '@graphql-mesh/types';
import type { MeshServePlugin } from '../types';

export function useSubgraphExecuteDebug<TContext>(opts: {
  logger: Logger;
}): MeshServePlugin<TContext> {
  return {
    onSubgraphExecute({ executionRequest, logger = opts.logger }) {
      logger.debug(`subgraph-execute`, () => ({
        query: defaultPrintFn(executionRequest.document),
        variables: executionRequest.variables,
      }));
      return function onSubgraphExecuteDone({ result }) {
        if (isAsyncIterable(result)) {
          return {
            onNext(value) {
              logger.debug(`subgraph-response-next`, value);
            },
            onEnd() {
              logger.debug(`subgraph-response-end`);
            },
          };
        }
        logger.debug(`subgraph-response`, {
          data: result.data,
          errors: result.errors,
        });
      };
    },
  };
}
