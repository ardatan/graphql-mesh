import type { MeshFetchRequestInit, MeshPlugin, OnFetchHook } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export interface OperationHeadersFactoryPayload<TContext> {
  context: TContext;
  url: string;
  options: MeshFetchRequestInit;
}

export type OperationHeadersFactory<TContext = any> = (
  payload: OperationHeadersFactoryPayload<TContext>,
) => Promise<Record<string, string>> | Record<string, string>;

export function useOperationHeaders<TContext>(factoryFn: OperationHeadersFactory<TContext>): {
  onFetch: OnFetchHook<TContext>;
} {
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
