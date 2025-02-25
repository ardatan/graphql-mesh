import type { GatewayContext, GatewayPlugin } from '@graphql-hive/gateway-runtime';
import type { MeshFetchRequestInit } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

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
      return handleMaybePromise(
        () =>
          factoryFn({
            url,
            options,
            context,
          }),
        newHeaders =>
          setOptions({
            ...options,
            headers: {
              ...getHeadersObj(options.headers || {}),
              ...newHeaders,
            },
          }),
      );
    },
  };
}
