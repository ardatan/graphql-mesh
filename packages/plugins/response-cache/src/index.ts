import { KeyValueCache, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { Plugin } from '@envelop/core';
import {
  BuildResponseCacheKeyFunction,
  Cache,
  defaultBuildResponseCacheKey,
  ShouldCacheResultFunction,
  useResponseCache,
} from '@envelop/response-cache';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';
import { ExecutionArgs } from 'graphql';
import { printWithCache } from '@graphql-mesh/utils';

function getDocumentString(args: ExecutionArgs) {
  return printWithCache(args.document);
}

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
    return new Function(`return ${ifDef}`)();
  };
}

function getBuildResponseCacheKey(cacheKeyDef: string): BuildResponseCacheKeyFunction {
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

function getShouldCacheResult(shouldCacheResultDef: string): ShouldCacheResultFunction {
  return function shouldCacheResult({ result }) {
    // eslint-disable-next-line no-new-func
    return new Function(`return ${shouldCacheResultDef}`)();
  };
}

function getCacheForResponseCache(meshCache: KeyValueCache): Cache {
  return {
    get(responseId) {
      return meshCache.get(`response-cache:${responseId}`);
    },
    async set(responseId, data, entities, ttl) {
      const ttlConfig = Number.isFinite(ttl) ? { ttl: ttl / 1000 } : undefined;
      await Promise.all(
        [...entities].map(async ({ typename, id }) => {
          const entryId = `${typename}.${id}`;
          await meshCache.set(`response-cache:${entryId}:${responseId}`, {}, ttlConfig);
          await meshCache.set(`response-cache:${responseId}:${entryId}`, {}, ttlConfig);
        })
      );
      return meshCache.set(`response-cache:${responseId}`, data, ttlConfig);
    },
    async invalidate(entitiesToRemove) {
      const responseIdsToCheck = new Set<string>();
      await Promise.all(
        [...entitiesToRemove].map(async ({ typename, id }) => {
          const entryId = `${typename}.${id}`;
          const cacheEntriesToDelete = await meshCache.getKeysByPrefix(`response-cache:${entryId}:`);
          await Promise.all(
            cacheEntriesToDelete.map(cacheEntryName => {
              const [, , responseId] = cacheEntryName.split(':');
              responseIdsToCheck.add(responseId);
              return meshCache.delete(entryId);
            })
          );
        })
      );
      await Promise.all(
        [...responseIdsToCheck].map(async responseId => {
          const cacheEntries = await meshCache.getKeysByPrefix(`response-cache:${responseId}:`);
          if (cacheEntries.length === 0) {
            await meshCache.delete(`response-cache:${responseId}`);
          }
        })
      );
    },
  };
}

export default function useMeshResponseCache(options: MeshPluginOptions<YamlConfig.ResponseCacheConfig>): Plugin {
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
    includeExtensionMetadata: options.includeExtensionMetadata,
    ttlPerType,
    ttlPerSchemaCoordinate,
    getDocumentString,
    session: generateSessionIdFactory(options.sessionId),
    enabled: options.if ? generateEnabledFactory(options.if) : undefined,
    buildResponseCacheKey: options.cacheKey ? getBuildResponseCacheKey(options.cacheKey) : undefined,
    shouldCacheResult: options.shouldCacheResult ? getShouldCacheResult(options.shouldCacheResult) : undefined,
    cache: getCacheForResponseCache(options.cache),
  });
}
