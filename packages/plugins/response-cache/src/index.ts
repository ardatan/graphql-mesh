import type { Plugin } from 'graphql-yoga';
import { defaultBuildResponseCacheKey } from '@envelop/response-cache';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { KeyValueCache, YamlConfig } from '@graphql-mesh/types';
import type { UseResponseCacheParameter } from '@graphql-yoga/plugin-response-cache';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';

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
      const jobs: Promise<void>[] = [];
      jobs.push(meshCache.set(`response-cache:${responseId}`, data, ttlConfig));
      for (const { typename, id } of entities) {
        const entryId = `${typename}.${id}`;
        jobs.push(meshCache.set(`response-cache:${entryId}:${responseId}`, {}, ttlConfig));
        jobs.push(meshCache.set(`response-cache:${responseId}:${entryId}`, {}, ttlConfig));
      }
      return Promise.all(jobs) as any;
    },
    invalidate(entitiesToRemove) {
      const responseIdsToCheck = new Set<string>();
      const entitiesToRemoveJobs: Promise<any>[] = [];
      for (const { typename, id } of entitiesToRemove) {
        const entryId = `${typename}.${id}`;
        entitiesToRemoveJobs.push(
          meshCache.getKeysByPrefix(`response-cache:${entryId}:`).then(cacheEntriesToDelete =>
            Promise.all(
              cacheEntriesToDelete.map(cacheEntryName => {
                const [, , responseId] = cacheEntryName.split(':');
                responseIdsToCheck.add(responseId);
                return meshCache.delete(entryId);
              }),
            ),
          ),
        );
      }
      return Promise.all(entitiesToRemoveJobs).then(() => {
        const responseIdsToCheckJobs: Promise<any>[] = [];
        for (const responseId of responseIdsToCheck) {
          responseIdsToCheckJobs.push(
            meshCache.getKeysByPrefix(`response-cache:${responseId}:`).then(cacheEntries => {
              if (cacheEntries.length !== 0) {
                return meshCache.delete(`response-cache:${responseId}`);
              }
              return undefined;
            }),
          );
        }
      });
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
export default function useMeshResponseCache(options: ResponseCacheConfig): Plugin;
/**
 * @deprecated Use new configuration format `ResponseCacheConfig`
 * @param options
 */
export default function useMeshResponseCache(
  options: YamlConfig.ResponseCacheConfig & {
    cache: KeyValueCache;
  },
): Plugin;
export default function useMeshResponseCache(
  options:
    | ResponseCacheConfig
    // TODO: This is for v0 compatibility, remove once v1 is released
    | (YamlConfig.ResponseCacheConfig & {
        cache: KeyValueCache;
      }),
): Plugin {
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

  return useResponseCache({
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
  });
}
