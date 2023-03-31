import { MeshPlugin } from '@graphql-mesh/types';

export default function useDeduplicateRequest(): MeshPlugin<any> {
  const reqResMapByContext = new WeakMap<any, Map<string, Promise<Response>>>();
  function getReqResMapByContext(context: any) {
    let reqResMap = reqResMapByContext.get(context);
    if (!reqResMap) {
      reqResMap = new Map();
      reqResMapByContext.set(context, reqResMap);
    }
    return reqResMap;
  }
  return {
    onFetch({ url, options, context, info, fetchFn, setFetchFn }) {
      if (context != null) {
        let method = 'GET';
        if (options.method) {
          method = options.method;
        }
        if (method === 'GET') {
          const reqResMap = getReqResMapByContext(context);

          const dedupCacheKey = JSON.stringify({
            url,
            headers: options.headers || {},
          });
          setFetchFn(() => {
            let dedupRes$ = reqResMap.get(dedupCacheKey);

            if (dedupRes$ == null) {
              dedupRes$ = fetchFn(url, options, context, info);
              reqResMap.set(dedupCacheKey, dedupRes$);
            }

            return dedupRes$;
          });
        }
      }
    },
  };
}
