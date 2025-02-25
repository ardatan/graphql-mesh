import CacheControlParser from 'cache-control-parser';
import { defaultBuildResponseCacheKey } from '@envelop/response-cache';
import type { GatewayContext, GatewayPlugin } from '@graphql-hive/gateway-runtime';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { KeyValueCache, YamlConfig } from '@graphql-mesh/types';
import { isPromise, mapMaybePromise } from '@graphql-tools/utils';
import type { UseResponseCacheParameter } from '@graphql-yoga/plugin-response-cache';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

function generateSessionIdFactory(sessionIdDef: string) {
  if (sessionIdDef == null) {
    return function voidSession(): null {
      return null;
    };
  }
  return function session(context: any) {
    return stringInterpolator.parse(sessionIdDef, {
      context,
      env: process.env,
    });
  };
}

function generateEnabledFactory(ifDef: string) {
  return function enabled(context: any) {
    // eslint-disable-next-line no-new-func
    return new Function('context', `return ${ifDef}`)(context);
  };
}

function getBuildResponseCacheKey(
  cacheKeyDef: string,
): UseResponseCacheParameter['buildResponseCacheKey'] {
  return function buildResponseCacheKey(cacheKeyParameters) {
    let cacheKey = stringInterpolator.parse(cacheKeyDef, {
      ...cacheKeyParameters,
      env: process.env,
    });
    if (!cacheKey) {
      cacheKey = defaultBuildResponseCacheKey(cacheKeyParameters);
    }
    return cacheKey;
  };
}

function getShouldCacheResult(
  shouldCacheResultDef: string,
): UseResponseCacheParameter['shouldCacheResult'] {
  return function shouldCacheResult({ result }) {
    // eslint-disable-next-line no-new-func
    return new Function(`return ${shouldCacheResultDef}`)();
  };
}

function getCacheForResponseCache(meshCache: KeyValueCache): UseResponseCacheParameter['cache'] {
  return {
    get(responseId) {
      return meshCache.get(`response-cache:${responseId}`);
    },
    set(responseId, data, entities, ttl) {
      const ttlConfig = Number.isFinite(ttl) ? { ttl: ttl / 1000 } : undefined;
      const jobs: PromiseLike<void>[] = [];
      const job = meshCache.set(`response-cache:${responseId}`, data, ttlConfig);
      if (isPromise(job)) {
        jobs.push(job);
      }
      for (const { typename, id } of entities) {
        const entryId = `${typename}.${id}`;
        const job1 = meshCache.set(`response-cache:${entryId}:${responseId}`, {}, ttlConfig);
        const job2 = meshCache.set(`response-cache:${responseId}:${entryId}`, {}, ttlConfig);
        if (isPromise(job1)) {
          jobs.push(job1);
        }
        if (isPromise(job2)) {
          jobs.push(job2);
        }
      }
      if (jobs.length === 0) {
        return undefined;
      }
      if (jobs.length === 1) {
        return jobs[0] as Promise<void>;
      }
      return Promise.all(jobs).then(() => undefined);
    },
    invalidate(entitiesToRemove) {
      const responseIdsToCheck = new Set<string>();
      const entitiesToRemoveJobs: PromiseLike<any>[] = [];
      for (const { typename, id } of entitiesToRemove) {
        const entryId = `${typename}.${id}`;
        const job = handleMaybePromise(
          () => meshCache.getKeysByPrefix(`response-cache:${entryId}:`),
          cacheEntriesToDelete => {
            const jobs: PromiseLike<any>[] = [];
            for (const cacheEntryName of cacheEntriesToDelete) {
              const [, , responseId] = cacheEntryName.split(':');
              responseIdsToCheck.add(responseId);
              const job = meshCache.delete(cacheEntryName);
              if (isPromise(job)) {
                jobs.push(job);
              }
            }
            if (jobs.length === 0) {
              return undefined;
            }
            if (jobs.length === 1) {
              return jobs[0];
            }
            return Promise.all(jobs);
          },
        );
        if (isPromise(job)) {
          entitiesToRemoveJobs.push(job);
        }
      }
      let promiseAllJob: PromiseLike<any> | undefined;
      if (entitiesToRemoveJobs.length === 1) {
        promiseAllJob = entitiesToRemoveJobs[0];
      } else if (entitiesToRemoveJobs.length > 0) {
        promiseAllJob = Promise.all(entitiesToRemoveJobs);
      }
      return handleMaybePromise(
        () => promiseAllJob,
        () => {
          const responseIdsToCheckJobs: PromiseLike<any>[] = [];
          for (const responseId of responseIdsToCheck) {
            const job = handleMaybePromise(
              () => meshCache.getKeysByPrefix(`response-cache:${responseId}:`),
              cacheEntries => {
                if (cacheEntries.length !== 0) {
                  return meshCache.delete(`response-cache:${responseId}`);
                }
                return undefined;
              },
            );
            if (isPromise(job)) {
              responseIdsToCheckJobs.push(job);
            }
          }
          if (responseIdsToCheckJobs.length === 0) {
            return undefined;
          } else if (responseIdsToCheckJobs.length === 1) {
            return responseIdsToCheckJobs[0];
          }
          return Promise.all(responseIdsToCheckJobs);
        },
      );
    },
  };
}

export type ResponseCacheConfig = Omit<UseResponseCacheParameter, 'cache'> & {
  /**
   * The Mesh cache instance to use for storing the response cache.
   *
   * The cache should be provided from the Mesh context:
   * ```ts
   * defineConfig({
   *   plugins: ctx => [
   *     useMeshResponseCache({ ...ctx })
   *   ]
   * })
   * ```
   */
  cache: KeyValueCache;
};

/**
 * Response cache plugin for GraphQL Mesh
 * @param options
 */
export default function useMeshResponseCache(options: ResponseCacheConfig): GatewayPlugin;
/**
 * @deprecated Use new configuration format `ResponseCacheConfig`
 * @param options
 */
export default function useMeshResponseCache(
  options: YamlConfig.ResponseCacheConfig & {
    cache: KeyValueCache;
  },
): GatewayPlugin;
export default function useMeshResponseCache(
  options:
    | ResponseCacheConfig
    // TODO: This is for v0 compatibility, remove once v1 is released
    | (YamlConfig.ResponseCacheConfig & {
        cache: KeyValueCache;
      }),
): GatewayPlugin {
  const ttlPerType: Record<string, number> = { ...(options as ResponseCacheConfig).ttlPerType };
  const ttlPerSchemaCoordinate: Record<string, number> = {
    ...(options as ResponseCacheConfig).ttlPerSchemaCoordinate,
  };

  const { ttlPerCoordinate } = options as YamlConfig.ResponseCacheConfig;
  if (ttlPerCoordinate) {
    for (const ttlConfig of ttlPerCoordinate) {
      ttlPerSchemaCoordinate[ttlConfig.coordinate] = ttlConfig.ttl;
    }
  }

  // Stored TTL by the context
  // To be compared with the calculated one later in `onTtl`
  const ttlByContext = new WeakMap<any, number>();

  // @ts-expect-error - GatewayPlugin types
  const plugin: GatewayPlugin = useResponseCache({
    includeExtensionMetadata:
      options.includeExtensionMetadata != null
        ? options.includeExtensionMetadata
        : process.env.DEBUG === '1',
    session: 'sessionId' in options ? generateSessionIdFactory(options.sessionId) : () => null,
    enabled: 'if' in options ? generateEnabledFactory(options.if) : undefined,
    buildResponseCacheKey:
      'cacheKey' in options ? getBuildResponseCacheKey(options.cacheKey) : undefined,

    ...options,

    shouldCacheResult:
      typeof options.shouldCacheResult === 'string'
        ? getShouldCacheResult(options.shouldCacheResult)
        : options.shouldCacheResult,
    cache: getCacheForResponseCache(options.cache),
    ttlPerType,
    ttlPerSchemaCoordinate,
    // Checks the TTL stored in the context
    // Compares it to the calculated one
    // Then it takes the lowest value
    onTtl({ ttl, context }) {
      const ttlForThisContext = ttlByContext.get(context);
      if (ttlForThisContext != null && ttlForThisContext < ttl) {
        return ttlForThisContext;
      }
      return ttl;
    },
  });
  // Checks the TTL stored in the context
  // Takes the lowest value
  function checkTtl(context: GatewayContext, ttl: number) {
    const ttlForThisContext = ttlByContext.get(context);
    if (ttlForThisContext == null || ttl < ttlForThisContext) {
      ttlByContext.set(context, ttl);
    }
  }
  plugin.onFetch = function ({ executionRequest, context }) {
    // Only if it is a subgraph request
    if (executionRequest && context) {
      return function onFetchDone({ response }) {
        const cacheControlHeader = response.headers.get('cache-control');
        if (cacheControlHeader != null) {
          const parsedCacheControl = CacheControlParser.parse(cacheControlHeader);
          if (parsedCacheControl['max-age'] != null) {
            const maxAgeInSeconds = parsedCacheControl['max-age'];
            const maxAgeInMs = maxAgeInSeconds * 1000;
            checkTtl(context, maxAgeInMs);
          }
          if (parsedCacheControl['s-maxage'] != null) {
            const sMaxAgeInSeconds = parsedCacheControl['s-maxage'];
            const sMaxAgeInMs = sMaxAgeInSeconds * 1000;
            checkTtl(context, sMaxAgeInMs);
          }
        }
      };
    }
  };
  return plugin;
}
