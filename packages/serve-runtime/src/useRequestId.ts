import { contextIdMap } from '@graphql-tools/delegate';
import { ServerAdapterPlugin } from '@whatwg-node/server';

export const requestIdByRequest = new WeakMap<Request, string>();

export function useRequestId(): ServerAdapterPlugin {
  return {
    onRequest({ serverContext, request, fetchAPI }) {
      const requestId = fetchAPI.crypto.randomUUID();
      contextIdMap.set(serverContext, requestId);
      requestIdByRequest.set(request, requestId);
    },
    onResponse({ request, response }) {
      const requestId = requestIdByRequest.get(request);
      if (requestId) {
        response.headers.set('x-request-id', requestId);
      }
    },
  };
}
