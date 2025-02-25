import type { MeshPlugin } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { mapMaybePromise, type MaybePromise } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export default function useDeduplicateRequest(): MeshPlugin<any> {
  const reqResMapByContext = new WeakMap<any, Map<string, MaybePromise<Response>>>();
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
    onFetch({ url, options, context, info, fetchFn, setFetchFn, endResponse }) {
      if (context != null) {
        let method = 'GET';
        if (options.method) {
          method = options.method;
        }
        if (method === 'GET') {
          const reqResMap = getReqResMapByContext(context);

          let dedupCacheKey = url;
          if (options.headers) {
            const headersObj = getHeadersObj(options.headers);
            dedupCacheKey += JSON.stringify(headersObj);
          }
          const dedupRes$ = reqResMap.get(dedupCacheKey);
          if (dedupRes$) {
            endResponse(dedupRes$);
            return;
          }
          setFetchFn(() => {
            let dedupRes$ = reqResMap.get(dedupCacheKey);
            if (dedupRes$ == null) {
              dedupRes$ = handleMaybePromise(
                () => fetchFn(url, options, context, info),
                res => {
                  let resPropMapByRes = resPropMap.get(res);
                  if (resPropMapByRes == null) {
                    resPropMapByRes = new Map();
                    resPropMap.set(res, resPropMapByRes);
                  }
                  return new Proxy(res, {
                    get(target, prop: keyof Response) {
                      if (typeof target[prop] === 'function') {
                        return (...args: any) => {
                          let resPropResult$ = resPropMapByRes.get(prop);
                          if (resPropResult$ == null) {
                            resPropResult$ = (target[prop] as any)(...args);
                            resPropMapByRes.set(prop, resPropResult$);
                          }
                          return resPropResult$;
                        };
                      }
                      return target[prop];
                    },
                  });
                },
              );
              reqResMap.set(dedupCacheKey, dedupRes$);
            }

            return dedupRes$;
          });
        }
      }
    },
  };
}
