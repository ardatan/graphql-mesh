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
  const resPropMap = new WeakMap<Response, Map<keyof Response, Promise<any>>>();
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

            return dedupRes$.then(res => {
              let resPropMapByRes = resPropMap.get(res);
              if (!resPropMapByRes) {
                resPropMapByRes = new Map();
                resPropMap.set(res, resPropMapByRes);
              }
              return new Proxy(res, {
                get(target, prop: keyof Response) {
                  if (typeof target[prop] === 'function') {
                    return (...args: any) => {
                      let resPropResult$ = resPropMapByRes.get(prop);
                      if (!resPropResult$) {
                        resPropResult$ = (target[prop] as any)(...args);
                        resPropMapByRes.set(prop, resPropResult$);
                      }
                      return resPropResult$;
                    };
                  }
                  return target[prop];
                },
              });
            });
          });
        }
      }
    },
  };
}
