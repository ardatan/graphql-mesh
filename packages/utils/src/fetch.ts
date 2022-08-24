import { fetchFactory as useCachedFetch } from 'fetchache';
import { fetch, Request, Response } from '@whatwg-node/fetch';
import { KeyValueCache } from '@graphql-mesh/types';
import { memoize1 } from '@graphql-tools/utils';
import { getHeadersObj } from './getHeadersObj';
import { Path } from 'graphql/jsutils/Path';
import { GraphQLResolveInfo } from 'graphql';

export type MeshFetch = (
  url: string,
  options?: RequestInit,
  context?: any,
  info?: GraphQLResolveInfo
) => Promise<Response>;

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

export interface MeshFetchHTTPInformation {
  sourceName: string;
  path: Path;
  request: {
    timestamp: number;
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  response: {
    timestamp: number;
    status: number;
    statusText: string;
    headers: Record<string, string>;
  };
  responseTime: number;
}

export const httpDetailsByContext = new WeakMap<any, MeshFetchHTTPInformation[]>();

export function pushHttpDetails(httpDetails: MeshFetchHTTPInformation, context: any) {
  let httpDetailsList = httpDetailsByContext.get(context);
  if (!httpDetailsList) {
    httpDetailsList = [];
    httpDetailsByContext.set(context, httpDetailsList);
  }
  httpDetailsList.push(httpDetails);
}

export function useDeduplicateRequestsFetch(nonDuplicateFetch: MeshFetch): MeshFetch {
  return function fetchWithDeduplicatedRequests(url, options = {}, context, info): Promise<Response> {
    if (context == null) {
      return nonDuplicateFetch(url, options, context, info);
    }
    let method = 'GET';
    if (options.method) {
      method = options.method;
    }
    if (method !== 'GET') {
      return nonDuplicateFetch(url, options, context, info);
    }

    let headers: Record<string, string> = {};

    if (options.headers) {
      headers = getHeadersObj(options.headers as Headers);
    }

    const acceptHeader = headers.Accept || headers.accept;
    if (!acceptHeader?.includes('application/json')) {
      return nonDuplicateFetch(url, options, context, info);
    }

    const reqResMap = getReqResMapByContext(context);

    const dedupCacheKey = JSON.stringify({
      url,
      headers,
    });

    let dedupRes$ = reqResMap.get(dedupCacheKey);

    if (dedupRes$ == null) {
      dedupRes$ = nonDuplicateFetch(url, options, context, info).then(async res => ({
        res,
        resText: await res.text(),
      }));
      reqResMap.set(dedupCacheKey, dedupRes$);
    }

    return dedupRes$.then(({ res, resText }) => new Response(resText, res));
  };
}

export function useHttpDetailsFetch(nonDetailedFetch: MeshFetch): MeshFetch {
  return function fetchWithHttpDetails(url, options = {}, context, info): Promise<Response> {
    if (context == null) {
      return nonDetailedFetch(url, options, context, info);
    }
    const requestTimestamp = Date.now();
    return nonDetailedFetch(url, options, context, info).then(res => {
      const responseTimestamp = Date.now();
      const responseTime = responseTimestamp - requestTimestamp;
      pushHttpDetails(
        {
          sourceName: (info as any)?.sourceName,
          path: info?.path,
          request: {
            timestamp: requestTimestamp,
            url,
            method: options.method || 'GET',
            headers: getHeadersObj(options.headers as Headers),
          },
          response: {
            timestamp: responseTimestamp,
            status: res.status,
            statusText: res.statusText,
            headers: getHeadersObj(res.headers),
          },
          responseTime,
        },
        context
      );
      return res;
    });
  };
}

export const createDefaultMeshFetch = memoize1(function createDefaultMeshFetch(cache: KeyValueCache): MeshFetch {
  return useHttpDetailsFetch(
    useDeduplicateRequestsFetch(
      useCachedFetch({
        cache,
        fetch,
        Request,
        Response,
      })
    )
  );
});
