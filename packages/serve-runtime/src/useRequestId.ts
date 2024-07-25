import { loggerForExecutionRequest } from '@graphql-mesh/fusion-runtime';
import type { Logger } from '@graphql-mesh/types';
import type { MeshServePlugin } from './types';

export const requestIdMap = new WeakMap<Request, string>();

export function useRequestId<TContext>(opts: { logger: Logger }): MeshServePlugin<TContext> {
  return {
    onRequest({ request, fetchAPI }) {
      const requestId = request.headers.get('x-request-id') || fetchAPI.crypto.randomUUID();
      requestIdMap.set(request, requestId);
    },
    // Hook request ID to the logger
    onSubgraphExecute({ executionRequest }) {
      if (executionRequest.context?.request) {
        const requestId = requestIdMap.get(executionRequest.context.request);
        if (requestId) {
          let execReqLogger = loggerForExecutionRequest.get(executionRequest) || opts.logger;
          execReqLogger = execReqLogger.child(requestId);
          loggerForExecutionRequest.set(executionRequest, execReqLogger);
        }
      }
    },
    onFetch({ context, options, setOptions }) {
      const requestId = requestIdMap.get(context?.request);
      if (requestId) {
        setOptions({
          ...(options || {}),
          headers: {
            ...(options.headers || {}),
            'x-request-id': requestId,
          },
        });
      }
    },
    onResponse({ request, response }) {
      const requestId = requestIdMap.get(request);
      if (requestId) {
        response.headers.set('x-request-id', requestId);
      }
    },
  };
}
