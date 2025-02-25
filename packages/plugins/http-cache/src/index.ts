import CachePolicy from 'http-cache-semantics';
import type { GatewayPlugin } from '@graphql-hive/gateway';
import type { KeyValueCache, Logger } from '@graphql-mesh/types';
import { getHeadersObj, mapMaybePromise } from '@graphql-mesh/utils';
import {
  Response as DefaultResponseCtor,
  URLPattern as DefaultURLPatternCtor,
} from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

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

  logger?: Logger;
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

export default function useHTTPCache<TContext extends Record<string, any>>({
  cache,
  matches,
  ignores,
  logger,
}: HTTPCachePluginOptions): GatewayPlugin<TContext> {
  if (!cache) {
    throw new Error('HTTP Cache plugin requires a cache instance');
  }
  let matchesPatterns: URLPattern[];
  let ignoresPatterns: URLPattern[];
  let URLPatternCtor: typeof URLPattern = DefaultURLPatternCtor;
  let ResponseCtor: typeof Response = DefaultResponseCtor;
  function shouldSkip(url: string) {
    ignoresPatterns ||= ignores?.map(match => new URLPatternCtor(match)) || [];
    if (ignoresPatterns?.length) {
      for (const pattern of ignoresPatterns) {
        if (pattern.test(url)) {
          logger?.debug(`Ignore pattern ${pattern} matched for ${url}`);
          return true;
        }
      }
    }
    matchesPatterns ||= matches?.map(match => new URLPatternCtor(match)) || [];
    if (matchesPatterns?.length) {
      for (const pattern of matchesPatterns) {
        if (pattern.test(url)) {
          logger?.debug(`Match pattern ${pattern} matched for ${url}`);
          return false;
        }
      }
      logger?.debug(`No match pattern matched for ${url}`);
      return true;
    }
    return false;
  }
  const pluginLogger = logger?.child({ plugin: 'HTTP Cache' });
  return {
    onYogaInit({ yoga }) {
      if (yoga.fetchAPI.URLPattern) {
        URLPatternCtor = yoga.fetchAPI.URLPattern;
      }
      if (yoga.fetchAPI.Response) {
        ResponseCtor = yoga.fetchAPI.Response;
      }
      // @ts-expect-error - Logger type mismatch
      logger ||= yoga.logger;
    },
    onFetch({ url, options, setOptions, context, endResponse }) {
      if (shouldSkip(url) || typeof options.body === 'object') {
        pluginLogger?.debug(`Skipping cache for ${url}`);
        return;
      }
      const cacheKey = `http-cache-${url}-${options.method}-${options.body}`;
      const policyRequest: CachePolicy.Request = {
        url,
        headers: getHeadersObj(options.headers),
      };
      return handleMaybePromise(
        () => cache.get(cacheKey),
        function handleCacheEntry(cacheEntry: CacheEntry) {
          let policy: CachePolicy;
          function returnCachedResponse(endResponse: (response: Response) => void) {
            return endResponse(
              new ResponseCtor(cacheEntry.body, {
                status: cacheEntry.response.status,
                // @ts-expect-error - Headers type mismatch
                headers: policy.responseHeaders(),
              }),
            );
          }
          if (cacheEntry?.policy) {
            pluginLogger?.debug(`Cache hit for ${url}`);
            policy = CachePolicy.fromObject(cacheEntry.policy);
            if (policy?.satisfiesWithoutRevalidation(policyRequest)) {
              pluginLogger?.debug(`Cache hit is fresh for ${url}`);
              return returnCachedResponse(endResponse);
            } else if (policy?.revalidationHeaders) {
              pluginLogger?.debug(`Cache will be revalidated for ${url}`);
              setOptions({
                ...options,
                // @ts-expect-error - Headers type mismatch
                headers: policy.revalidationHeaders(policyRequest),
              });
            }
          }
          return function handleResponse({ response, setResponse }) {
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
                    pluginLogger?.debug(`TTL: ${ttl}ms`);
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
              context?.waitUntil(store$);
            }
            if (policy) {
              const revalidationPolicy = policy.revalidatedPolicy(policyRequest, policyResponse);
              policy = revalidationPolicy.policy;
              if (revalidationPolicy.matches) {
                pluginLogger?.debug(`Response not modified for ${url}`);
                body$ = cacheEntry.body;
                updateCacheEntry();
                return returnCachedResponse(setResponse);
              }
              pluginLogger?.debug(`Updating the cache entry cache for ${url}`);
            } else {
              pluginLogger?.debug(`Creating the cache entry for ${url}`);
              policy = new CachePolicy(policyRequest, policyResponse);
            }
            if (policy.storable()) {
              pluginLogger?.debug(`Storing the cache entry for ${url}`);
              body$ = response.text();
              updateCacheEntry();
              return body$.then(body =>
                setResponse(
                  new ResponseCtor(body, {
                    ...response,
                    // @ts-expect-error - Headers type mismatch
                    headers: policy.responseHeaders(),
                  }),
                ),
              );
            } else {
              if (cacheEntry) {
                pluginLogger?.debug(`Deleting the cache entry for ${url}`);
                const delete$ = cache.delete(cacheKey);
                // @ts-expect-error - Promise type mismatch
                context?.waitUntil(delete$);
              }
            }
          };
        },
      );
    },
  };
}
