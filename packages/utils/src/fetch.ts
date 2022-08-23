import { fetchFactory as useCache } from 'fetchache';
import { fetch, Request, Response } from '@whatwg-node/fetch';
import { KeyValueCache } from '@graphql-mesh/types';
import { memoize1 } from '@graphql-tools/utils';
import { getHeadersObj } from './getHeadersObj';

export type MeshFetch = (url: string, options?: RequestInit, context?: any) => Promise<Response>;

export interface DefaultMeshFetchOptions {
  cache: KeyValueCache;
}

const getReqResMapByContext = memoize1((context: any) => {
  return new Map<
    string,
    Promise<{
      res: Response;
      resText: string;
    }>
  >();
});

export const createDefaultMeshFetch = memoize1(function createDefaultMeshFetch(cache: KeyValueCache): MeshFetch {
  const cachedFetchFn = useCache({
    cache,
    fetch,
    Request,
    Response,
  });
  return function defaultMeshFetch(url, options = {}, context): Promise<Response> {
    if (context == null) {
      return cachedFetchFn(url, options);
    }
    let method = 'GET';
    if (options.method) {
      method = options.method;
    }
    if (method !== 'GET') {
      return fetch(url, options);
    }

    let headers: Record<string, string> = {};

    if (options.headers) {
      if ('get' in options.headers) {
        headers = getHeadersObj(options.headers as Headers);
      } else {
        headers = options.headers as Record<string, string>;
      }
    }

    const acceptHeader = headers.Accept || headers.accept;
    if (!acceptHeader?.includes('application/json')) {
      return cachedFetchFn(url, options);
    }

    const reqResMap = getReqResMapByContext(context);

    const dedupCacheKey = JSON.stringify({
      url,
      headers,
    });

    let dedupRes$ = reqResMap.get(dedupCacheKey);

    if (dedupRes$ == null) {
      dedupRes$ = cachedFetchFn(url, options).then(async res => ({
        res,
        resText: await res.text(),
      }));
      reqResMap.set(dedupCacheKey, dedupRes$);
    }

    return dedupRes$.then(({ res, resText }) => new Response(resText, res));
  };
});
