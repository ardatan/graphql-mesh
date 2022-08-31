import { MeshPlugin } from '@graphql-mesh/types';
import { memoize1 } from '@graphql-tools/utils';
import { getHeadersObj } from '@graphql-mesh/utils';
import { Response } from '@whatwg-node/fetch';

export function useDeduplicateRequest(): MeshPlugin<any> {
  const getReqResMapByContext = memoize1((_context: any) => {
    return new Map<
      string,
      Promise<{
        res: Response;
        resText: string;
      }>
    >();
  });
  return {
    onFetch({ url, options, context, info, fetchFn, setFetchFn }) {
      if (context !== null) {
        let method = 'GET';
        if (options.method) {
          method = options.method;
        }
        if (method === 'GET') {
          let headers: Record<string, string> = {};

          if (options.headers) {
            headers = getHeadersObj(options.headers as Headers);
          }

          const acceptHeader = headers.Accept || headers.accept;
          if (acceptHeader?.includes('application/json')) {
            const reqResMap = getReqResMapByContext(context);

            const dedupCacheKey = JSON.stringify({
              url,
              headers,
            });
            setFetchFn(() => {
              let dedupRes$ = reqResMap.get(dedupCacheKey);

              if (dedupRes$ == null) {
                dedupRes$ = fetchFn(url, options, context, info).then(async res => ({
                  res,
                  resText: await res.text(),
                }));
                reqResMap.set(dedupCacheKey, dedupRes$);
              }

              return dedupRes$.then(({ res, resText }) => new Response(resText, res));
            });
          }
        }
      }
    },
  };
}
