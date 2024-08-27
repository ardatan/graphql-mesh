import { requestIdByRequest } from '@graphql-mesh/utils';
import type { GatewayPlugin } from '../types';

export function useRequestId<TContext>(): GatewayPlugin<TContext> {
  return {
    onRequest({ request, fetchAPI }) {
      const requestId = request.headers.get('x-request-id') || fetchAPI.crypto.randomUUID();
      requestIdByRequest.set(request, requestId);
    },
    onFetch({ context, options, setOptions }) {
      const requestId = requestIdByRequest.get(context?.request);
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
      const requestId = requestIdByRequest.get(request);
      if (requestId) {
        response.headers.set('x-request-id', requestId);
      }
    },
  };
}
