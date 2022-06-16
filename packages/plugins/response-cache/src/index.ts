import { MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { Plugin } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

export default function useMeshResponseCache(options: MeshPluginOptions<YamlConfig.ResponseCacheConfig>): Plugin {
  const ttlPerType: Record<string, number> = {};
  const ttlPerSchemaCoordinate: Record<string, number> = {};
  for (const ttlConfig of options.ttlPerCoordinate) {
    if (ttlConfig.coordinate.includes('.')) {
      ttlPerSchemaCoordinate[ttlConfig.coordinate] = ttlConfig.ttl;
    } else {
      ttlPerType[ttlConfig.coordinate] = ttlConfig.ttl;
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
    getDocumentStringFromContext: (ctx: any) => ctx.query,
    cache: {
      get(responseId) {
        return options.cache.get(`response-cache:${responseId}`);
      },
      async set(responseId, data, entities, ttl) {
        await Promise.all(
          [...entities].map(async ({ typename, id }) => {
            const key = `${typename}.${id}`;
            const existingResponseIdSet = (await options.cache.get(`response-cache:${key}`)) || [];
            if (!existingResponseIdSet.includes(responseId)) {
              existingResponseIdSet.push(responseId);
            }
            await options.cache.set(`response-cache:${key}`, existingResponseIdSet);
          })
        );
        return options.cache.set(`response-cache:${responseId}`, data, { ttl: ttl / 1000 });
      },
      async invalidate(entitiesToRemove) {
        await Promise.all(
          [...entitiesToRemove].map(async ({ typename, id }) => {
            const key = `${typename}.${id}`;
            const existingResponseIdSet: string[] = (await options.cache.get(`response-cache:${key}`)) || [];
            await options.cache.delete(`response-cache:${key}`);
            await Promise.all(
              existingResponseIdSet.map(responseId => options.cache.delete(`response-cache:${responseId}`))
            );
          })
        );
      },
    },
  });
}
