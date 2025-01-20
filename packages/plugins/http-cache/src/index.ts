import CachePolicy from 'http-cache-semantics';
import type { GatewayPlugin } from '@graphql-hive/gateway';
import type { KeyValueCache, Logger } from '@graphql-mesh/types';
import { getHeadersObj, mapMaybePromise } from '@graphql-mesh/utils';
import {
  Response as DefaultResponseCtor,
  URLPattern as DefaultURLPatternCtor,
} from '@whatwg-node/fetch';

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
  const pluginLogger = logger?.child('HTTP Cache');
  return {
    onYogaInit({ yoga }) {
      if (yoga.fetchAPI.URLPattern) {
        URLPatternCtor = yoga.fetchAPI.URLPattern;
      }
      if (yoga.fetchAPI.Response) {
        ResponseCtor = yoga.fetchAPI.Response;
      }
    },
    onFetch({ url, options, context, endResponse }) {
      if (shouldSkip(url)) {
        pluginLogger?.debug(`Skipping cache for ${url}`);
        return;
      }
      const policyRequest: CachePolicy.Request = {
        url,
        method: options.method,
        headers: getHeadersObj(options.headers),
      };
      const cacheEntry$ = cache.get(url);
      return mapMaybePromise(cacheEntry$, function handleCacheEntry(cacheEntry: CacheEntry) {
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
            pluginLogger?.debug(`Cache hit is stale for ${url}`);
            // @ts-expect-error - Headers type mismatch
            options.headers = policy.revalidationHeaders(policyRequest);
          }
        }
        return function handleResponse({ response, setResponse }) {
          let body: Promise<string> | string;
          const policyResponse: CachePolicy.Response = {
            status: response.status,
            headers: getHeadersObj(response.headers),
          };
          function updateCacheEntry() {
            const store$ = mapMaybePromise(body, body => {
              const ttl = policy.timeToLive();
              pluginLogger?.debug(`TTL: ${ttl}ms`);
              return cache.set(
                url,
                {
                  policy: policy.toObject(),
                  response: policyResponse,
                  body,
                },
                {
                  ttl: ttl / 1000,
                },
              );
            });
            // @ts-expect-error - Promise type mismatch
            context?.waitUntil(store$);
          }
          if (policy) {
            pluginLogger?.debug(`Updating the cache entry cache for ${url}`);
            const revalidationPolicy = policy.revalidatedPolicy(policyRequest, policyResponse);
            policy = revalidationPolicy.policy;
            if (!revalidationPolicy.modified) {
              pluginLogger?.debug(`Response not modified for ${url}`);
              body = cacheEntry.body;
              updateCacheEntry();
              return returnCachedResponse(setResponse);
            }
          } else {
            pluginLogger?.debug(`Creating the cache entry for ${url}`);
            policy = new CachePolicy(policyRequest, policyResponse);
          }
          if (policy.storable()) {
            pluginLogger?.debug(`Storing the cache entry for ${url}`);
            body = response.text();
            updateCacheEntry();
            return body.then(body => setResponse(new ResponseCtor(body, response)));
          }
        };
      });
    },
  };
}
