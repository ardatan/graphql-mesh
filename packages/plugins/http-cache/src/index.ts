import type { Plugin as YogaPlugin } from 'graphql-yoga';
import CachePolicy from 'http-cache-semantics';
import type { Logger } from '@graphql-hive/logger';
import type { KeyValueCache, MeshPlugin } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import {
  Response as DefaultResponseCtor,
  URLPattern as DefaultURLPatternCtor,
} from '@whatwg-node/fetch';
import { fakePromise, handleMaybePromise } from '@whatwg-node/promise-helpers';

interface CacheEntry {
  policy: CachePolicy.CachePolicyObject;
  response: CachePolicy.Response;
  body: string;
}

export interface HTTPCachePluginOptions {
  /**
   * If the following patterns match the request URL, the response will be cached. (Any of: String, URLPatternObj)
   */
  matches?: (string | URLPatternObj)[];
  /**
   * If the following patterns match the request URL, the response will not be cached. (Any of: String, URLPatternObj)
   */
  ignores?: (string | URLPatternObj)[];

  policyOptions?:
    | CachePolicy.Options
    | ((request: CachePolicy.Request, response: CachePolicy.Response) => CachePolicy.Options);

  cache?: KeyValueCache<CacheEntry>;
}

export interface URLPatternObj {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

const cacheHeaders = ['Cache-Control', 'Expires', 'ETag', 'Last-Modified', 'Vary'];

export default function useHTTPCache<TContext extends Record<string, any>>({
  cache,
  matches,
  ignores,
}: HTTPCachePluginOptions): MeshPlugin<TContext> & YogaPlugin<TContext> {
  if (!cache) {
    throw new Error('HTTP Cache plugin requires a cache instance');
  }
  let matchesPatterns: URLPattern[];
  let ignoresPatterns: URLPattern[];
  let URLPatternCtor: typeof URLPattern = DefaultURLPatternCtor;
  let ResponseCtor: typeof Response = DefaultResponseCtor;
  function shouldSkip(url: string, log?: Logger) {
    ignoresPatterns ||= ignores?.map(match => new URLPatternCtor(match)) || [];
    if (ignoresPatterns?.length) {
      for (const pattern of ignoresPatterns) {
        if (pattern.test(url)) {
          log?.debug(`Ignore pattern ${pattern} matched for ${url}`);
          return true;
        }
      }
    }
    matchesPatterns ||= matches?.map(match => new URLPatternCtor(match)) || [];
    if (matchesPatterns?.length) {
      for (const pattern of matchesPatterns) {
        if (pattern.test(url)) {
          log?.debug(`Match pattern ${pattern} matched for ${url}`);
          return false;
        }
      }
      log?.debug(`No match pattern matched for ${url}`);
      return true;
    }
    return false;
  }
  return {
    onYogaInit({ yoga }) {
      if (yoga.fetchAPI.URLPattern) {
        URLPatternCtor = yoga.fetchAPI.URLPattern;
      }
      if (yoga.fetchAPI.Response) {
        ResponseCtor = yoga.fetchAPI.Response;
      }
    },
    onFetch({ url, options, setOptions, context, endResponse, log: fetchLog }) {
      const log = fetchLog?.child?.({ plugin: 'HTTP Cache' }) ?? context?.log;
      if (shouldSkip(url, log) || typeof options?.body === 'object') {
        log?.debug(`Skipping cache for ${url}`);
        return;
      }
      const cacheKey = `http-cache-${url}-${options?.method}-${options?.body}`;
      const policyRequest: CachePolicy.Request = {
        url,
        headers: getHeadersObj(options?.headers || {}),
      };
      return handleMaybePromise(
        () => cache.get(cacheKey),
        function handleCacheEntry(cacheEntry: CacheEntry) {
          let policy: CachePolicy;
          function returnCachedResponse(endResponse: (response: Response) => void) {
            return endResponse(
              new ResponseCtor(cacheEntry.body, {
                status: cacheEntry.response.status,
                headers: policy.responseHeaders() as HeadersInit,
              }),
            );
          }
          if (cacheEntry?.policy) {
            log?.debug(`Cache hit for ${url}`);
            policy = CachePolicy.fromObject(cacheEntry.policy);
            if (policy?.satisfiesWithoutRevalidation(policyRequest)) {
              log?.debug(`Cache hit is fresh for ${url}`);
              return returnCachedResponse(endResponse);
            } else if (policy?.revalidationHeaders) {
              log?.debug(`Cache will be revalidated for ${url}`);
              setOptions({
                ...(options || {}),
                headers: policy.revalidationHeaders(policyRequest) as Record<string, string>,
              });
            }
          }
          return function handleResponse({ response, setResponse }) {
            const cacheControlHeader = response.headers.get('Cache-Control');
            if (
              cacheHeaders.every(header => !response.headers.has(header)) ||
              cacheControlHeader?.includes('no-store') ||
              cacheControlHeader?.includes('max-age=0') ||
              cacheControlHeader?.includes('s-maxage=0')
            ) {
              return;
            }
            let body$: Promise<string> | string;
            const policyResponse: CachePolicy.Response = {
              status: response.status,
              headers: getHeadersObj(response.headers),
            };
            function updateCacheEntry() {
              const store$ = handleMaybePromise(
                () => body$,
                body => {
                  const ttl = policy.timeToLive();
                  if (ttl) {
                    log?.debug(`TTL: ${ttl}ms`);
                  }
                  return cache.set(
                    cacheKey,
                    {
                      policy: policy.toObject(),
                      response: policyResponse,
                      body,
                    },
                    ttl
                      ? {
                          ttl: ttl / 1000,
                        }
                      : undefined,
                  );
                },
              );
              context?.waitUntil?.(store$);
            }
            if (policy) {
              const revalidationPolicy = policy.revalidatedPolicy(policyRequest, policyResponse);
              policy = revalidationPolicy.policy;
              if (revalidationPolicy.matches) {
                log?.debug(`Response not modified for ${url}`);
                body$ = cacheEntry.body;
                updateCacheEntry();
                return returnCachedResponse(setResponse);
              }
              log?.debug(`Updating the cache entry cache for ${url}`);
            } else {
              log?.debug(`Creating the cache entry for ${url}`);
              policy = new CachePolicy(policyRequest, policyResponse);
            }
            if (policy.storable()) {
              log?.debug(`Storing the cache entry for ${url}`);
              body$ = response.text();
              updateCacheEntry();
              return fakePromise(body$).then(body =>
                setResponse(
                  new ResponseCtor(body, {
                    ...response,
                    headers: policy.responseHeaders() as HeadersInit,
                  }),
                ),
              );
            } else {
              if (cacheEntry) {
                log?.debug(`Deleting the cache entry for ${url}`);
                const delete$ = cache.delete(cacheKey);
                context?.waitUntil?.(delete$);
              }
            }
          };
        },
      );
    },
  };
}
