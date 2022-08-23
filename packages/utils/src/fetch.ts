import { fetchFactory as useCache } from 'fetchache';
import { fetch, Request, Response } from '@whatwg-node/fetch';
import { KeyValueCache } from '@graphql-mesh/types';
import { memoize1 } from '@graphql-tools/utils';
import { getHeadersObj } from './getHeadersObj';

export type MeshFetch = (url: string, options?: RequestInit, context?: any) => Promise<Response>;

export interface DefaultMeshFetchOptions {
  cache: KeyValueCache;
}

interface MeshFetchDeduplicatedResponse {
  headers: Record<string, string>;
  status: number;
  statusText: string;
  body: string;
}

const getReqResMapByContext = memoize1((context: any) => {
  return new Map<string, MeshFetchDeduplicatedResponse>();
});

export const createDefaultMeshFetch = memoize1(function createDefaultMeshFetch(cache: KeyValueCache): MeshFetch {
  const cachedFetchFn = useCache({
    cache,
    fetch,
    Request,
    Response,
  });
  return async function defaultMeshFetch(url, options = {}, context): Promise<Response> {
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

    const reqResMap = getReqResMapByContext(context);

    let headers = {};

    if (options.headers) {
      if ('get' in options.headers) {
        headers = getHeadersObj(options.headers as Headers);
      } else {
        headers = options.headers;
      }
    }

    const dedupCacheKey = JSON.stringify({
      url,
      headers,
    });

    let dedupRes = reqResMap.get(dedupCacheKey);

    if (dedupRes == null) {
      const res = await cachedFetchFn(url, options);
      const contentType = res.headers.get('content-type') || 'application/json';
      if (!contentType.startsWith('application/json')) {
        return res;
      }
      dedupRes = {
        headers: getHeadersObj(res.headers),
        status: res.status,
        statusText: res.statusText,
        body: await res.text(),
      };
      reqResMap.set(dedupCacheKey, dedupRes);
    }

    return new Response(dedupRes.body, {
      status: dedupRes.status,
      statusText: dedupRes.statusText,
      headers: dedupRes.headers,
    });
  };
});
