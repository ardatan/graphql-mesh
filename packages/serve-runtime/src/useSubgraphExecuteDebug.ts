import { isAsyncIterable } from 'graphql-yoga';
import { loggerForExecutionRequest } from '@graphql-mesh/fusion-runtime';
import { defaultPrintFn } from '@graphql-mesh/transport-common';
import type { Logger } from '@graphql-mesh/types';
import type { MeshServePlugin } from './types';
import { requestIdMap } from './useRequestId';

export function useSubgraphExecuteDebug<TContext>({
  logger,
}: {
  logger: Logger;
}): MeshServePlugin<TContext> {
  return {
    onSubgraphExecute({ executionRequest }) {
      const requestLogger = loggerForExecutionRequest.get(executionRequest) || logger;
      requestLogger.debug(`subgraph-execute`, {
        query: defaultPrintFn(executionRequest.document),
        variables: executionRequest.variables,
      });
      return function onSubgraphExecuteDone({ result }) {
        if (isAsyncIterable(result)) {
          return {
            onNext(value) {
              requestLogger.debug(`subgraph-response-next`, value);
            },
            onEnd() {
              requestLogger.debug(`subgraph-response-end`);
            },
          };
        }
        requestLogger.debug(`subgraph-response`, {
          data: result.data,
          errors: result.errors,
        });
      };
    },
  };
}
