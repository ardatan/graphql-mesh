import type { Plugin } from 'graphql-yoga';
import { defaultBuildResponseCacheKey } from '@envelop/response-cache';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { KeyValueCache, YamlConfig } from '@graphql-mesh/types';
import { useResponseCache, UseResponseCacheParameter } from '@graphql-yoga/plugin-response-cache';

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
              if (cacheEntries.length === 0) {
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

export default function useMeshResponseCache(
  options: YamlConfig.ResponseCacheConfig & {
    cache: KeyValueCache;
  },
): Plugin {
  const ttlPerType: Record<string, number> = {};
  const ttlPerSchemaCoordinate: Record<string, number> = {};
  if (options.ttlPerCoordinate) {
    for (const ttlConfig of options.ttlPerCoordinate) {
      if (ttlConfig.coordinate.includes('.')) {
        ttlPerSchemaCoordinate[ttlConfig.coordinate] = ttlConfig.ttl;
      } else {
        ttlPerType[ttlConfig.coordinate] = ttlConfig.ttl;
      }
    }
  }
  return useResponseCache({
    ttl: options.ttl,
    ignoredTypes: options.ignoredTypes,
    idFields: options.idFields,
    invalidateViaMutation: options.invalidateViaMutation,
    includeExtensionMetadata:
      options.includeExtensionMetadata != null
        ? options.includeExtensionMetadata
        : process.env.DEBUG === '1',
    ttlPerType,
    ttlPerSchemaCoordinate,
    session: generateSessionIdFactory(options.sessionId),
    enabled: options.if ? generateEnabledFactory(options.if) : undefined,
    buildResponseCacheKey: options.cacheKey
      ? getBuildResponseCacheKey(options.cacheKey)
      : undefined,
    shouldCacheResult: options.shouldCacheResult
      ? getShouldCacheResult(options.shouldCacheResult)
      : undefined,
    cache: getCacheForResponseCache(options.cache),
  });
}
