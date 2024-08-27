import type { GatewayContext, GatewayPlugin } from '@graphql-mesh/serve-runtime';
import type { MeshFetchRequestInit } from '@graphql-mesh/types';
import { getHeadersObj, mapMaybePromise } from '@graphql-mesh/utils';

export interface OperationHeadersFactoryPayload {
  context: GatewayContext;
  url: string;
  options: MeshFetchRequestInit;
}

export type OperationHeadersFactory = (
  payload: OperationHeadersFactoryPayload,
) => Promise<Record<string, string>> | Record<string, string>;

export function useOperationHeaders(factoryFn: OperationHeadersFactory): GatewayPlugin {
  return {
    onFetch({ url, options, context, setOptions }) {
      const existingHeaders = getHeadersObj(options.headers || {});
      const newHeaders$ = factoryFn({
        url,
        options,
        context,
      });
      return mapMaybePromise(newHeaders$, newHeaders => {
        setOptions({
          ...options,
          headers: {
            ...existingHeaders,
            ...newHeaders,
          },
        });
      });
    },
  };
}
