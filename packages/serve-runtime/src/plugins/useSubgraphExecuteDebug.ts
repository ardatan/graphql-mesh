import { isAsyncIterable } from 'graphql-yoga';
import { defaultPrintFn } from '@graphql-mesh/transport-common';
import type { Logger } from '@graphql-mesh/types';
import type { MeshServePlugin } from '../types';

export function useSubgraphExecuteDebug<TContext>(opts: {
  logger: Logger;
}): MeshServePlugin<TContext> {
  return {
    onSubgraphExecute({ executionRequest, logger = opts.logger }) {
      if (executionRequest) {
        logger.debug(`subgraph-execute`, () => ({
          query: executionRequest.document ?? defaultPrintFn(executionRequest.document),
          variables: executionRequest.variables,
        }));
      }
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
        if (result) {
          logger.debug(`subgraph-response`, {
            data: result.data,
            errors: result.errors,
          });
        }
      };
    },
  };
}
