/* eslint-disable @typescript-eslint/ban-types */
import CachePolicy from 'http-cache-semantics';
import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { Response, URLPattern } from '@whatwg-node/fetch';

interface CacheEntry {
  policy: CachePolicy.CachePolicyObject;
  response: {
    status: number;
    headers: Record<string, string>;
  };
  body: string;
}

export default function useHTTPCache({
  cache,
  matches,
  ignores,
}: MeshPluginOptions<YamlConfig.HTTPCachePlugin>): MeshPlugin<{}> {
  let matchesPatterns: URLPattern[] | undefined;
  if (matches) {
    matchesPatterns = matches.map(match => new URLPattern(match));
  }
  let ignoresPatterns: URLPattern[] | undefined;
  if (ignores) {
    ignoresPatterns = ignores.map(match => new URLPattern(match));
  }
  return {
    async onFetch({ url, options, fetchFn, setFetchFn }) {
      if (matchesPatterns && !matchesPatterns.some(pattern => pattern.test(url))) {
        return () => {};
      }
      if (ignoresPatterns && ignoresPatterns.some(pattern => pattern.test(url))) {
        return () => {};
      }
      if (options.cache === 'no-cache') {
        return () => {};
      }
      const reqHeaders: Record<string, string> = getHeadersObj(options.headers as any);
      const policyRequest: CachePolicy.Request = {
        url,
        method: options.method,
        headers: reqHeaders,
      };

      const cacheEntry = (await cache.get(url)) as CacheEntry;
      if (cacheEntry) {
        const policy = CachePolicy.fromObject(cacheEntry.policy);
        setFetchFn(async (url, options, context, info) => {
          if (options.cache !== 'reload' && policy?.satisfiesWithoutRevalidation(policyRequest)) {
            const resHeaders: Record<string, string> = {};
            const policyHeaders = policy.responseHeaders();
            for (const key in policyHeaders) {
              const value = policyHeaders[key];
              if (Array.isArray(value)) {
                resHeaders[key] = value.join(', ');
              } else {
                resHeaders[key] = value;
              }
            }
            const response = new Response(cacheEntry.body, {
              status: cacheEntry.response.status,
              headers: resHeaders,
            });
            return response;
          }
          const policyHeaders = policy.revalidationHeaders(policyRequest);
          const reqHeaders: Record<string, string> = {};
          for (const key in policyHeaders) {
            const value = policyHeaders[key];
            if (Array.isArray(value)) {
              reqHeaders[key] = value.join(', ');
            } else {
              reqHeaders[key] = value;
            }
          }
          const revalidationRequest = {
            url,
            method: options.method,
            headers: reqHeaders,
          };
          const revalidationResponse = await fetchFn(
            url,
            {
              ...options,
              method: revalidationRequest.method,
              headers: {
                ...options.headers,
                ...revalidationRequest.headers,
              },
            },
            context,
            info,
          );

          const { policy: revalidatedPolicy, modified } = policy.revalidatedPolicy(
            revalidationRequest,
            {
              status: revalidationResponse.status,
              headers: getHeadersObj(revalidationResponse.headers as any),
            },
          );

          const newBody = await revalidationResponse.text();

          const resHeaders: Record<string, string> = {};

          const resPolicyHeaders = revalidatedPolicy.responseHeaders();

          for (const key in resPolicyHeaders) {
            const value = resPolicyHeaders[key];
            if (Array.isArray(value)) {
              resHeaders[key] = value.join(', ');
            } else {
              resHeaders[key] = value;
            }
          }
          return new Response(modified ? newBody : cacheEntry.body, {
            status: revalidationResponse.status,
            headers: resHeaders,
          });
        });
      }
      if (options.cache === 'no-store') {
        return () => {};
      }
      return async ({ response, setResponse }) => {
        const resHeaders = getHeadersObj(response.headers);
        const policyResponse = {
          status: response.status,
          headers: resHeaders,
        };
        const policy = new CachePolicy(policyRequest, policyResponse);
        if (policy.storable()) {
          const resText = await response.text();
          const cacheEntry: CacheEntry = {
            policy: policy.toObject(),
            response: policyResponse,
            body: resText,
          };

          let ttl = Math.round(policy.timeToLive() / 1000);
          if (ttl > 0) {
            // If a response can be revalidated, we don't want to remove it from the cache right after it expires.
            // We may be able to use better heuristics here, but for now we'll take the max-age times 2.
            if (canBeRevalidated(response)) {
              ttl *= 2;
            }

            await cache.set(url, cacheEntry, { ttl });
          }

          setResponse(
            new Response(resText, {
              status: response.status,
              headers: resHeaders,
            }),
          );
        }
      };
    },
  };
}

function canBeRevalidated(response: Response): boolean {
  return response.headers.has('ETag');
}
