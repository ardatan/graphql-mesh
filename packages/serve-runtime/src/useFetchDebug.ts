import { loggerForExecutionRequest } from '@graphql-mesh/fusion-runtime';
import type { Logger } from '@graphql-mesh/types';
import type { MeshServePlugin } from './types';
import { requestIdMap } from './useRequestId.js';

export function useFetchDebug<TContext>({ logger }: { logger: Logger }): MeshServePlugin<TContext> {
  return {
    onFetch({ url, options, context, info }) {
      let requestLogger = logger;
      if (info?.executionRequest) {
        const execReqLogger = loggerForExecutionRequest.get(info.executionRequest);
        if (execReqLogger) {
          requestLogger = execReqLogger;
        }
      }
      if (context?.request) {
        const requestId = requestIdMap.get(context.request);
        if (requestId) {
          requestLogger = requestLogger.child(requestId);
        }
      }
      requestLogger = requestLogger.child('fetch');
      requestLogger.debug('request', {
        url,
        ...(options || {}),
      });
      return function onFetchDone({ response }) {
        requestLogger.debug('response', {
          url,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        });
      };
    },
  };
}
