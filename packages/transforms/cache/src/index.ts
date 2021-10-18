import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { ResolversComposerMapping, ResolversComposition, composeResolvers } from '@graphql-tools/resolvers-composition';
import { computeCacheKey } from './compute-cache-key';
import { extractResolvers } from '@graphql-mesh/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';

export default class CacheTransform implements MeshTransform {
  noWrap = true;
  constructor(private options: MeshTransformOptions<YamlConfig.CacheTransformConfig[]>) {}
  transformSchema(schema: GraphQLSchema) {
    const { config, pubsub, cache } = this.options;
    const sourceResolvers = extractResolvers(schema);
    const compositions: ResolversComposerMapping = {};

    for (const cacheItem of config) {
      const effectingOperations = cacheItem.invalidate?.effectingOperations || [];

      if (effectingOperations.length > 0) {
        pubsub.subscribe('resolverDone', async ({ resolverData }) => {
          const effectingRule = effectingOperations.find(
            o => o.operation === `${resolverData.info.parentType.name}.${resolverData.info.fieldName}`
          );

          if (effectingRule) {
            const cacheKey = computeCacheKey({
              keyStr: effectingRule.matchKey,
              args: resolverData.args,
              info: resolverData.info,
            });

            await cache.delete(cacheKey);
          }
        });
      }

      // Not ideal solution because this will only wait for local cache entries
      const cacheKeyWritePromises = new Map<string, Promise<any>>();

      compositions[cacheItem.field] = (originalResolver => async (root: any, args: any, context: any, info: any) => {
        const cacheKey = computeCacheKey({
          keyStr: cacheItem.cacheKey,
          args,
          info,
        });

        const cachedValue = await cache.get(cacheKey);

        // This will wait for other instances
        const waitForOtherCacheWrite = !!cachedValue?.__WAIT_FOR_CACHE_WRITE;

        if (cachedValue && !waitForOtherCacheWrite) {
          return cachedValue;
        }

        if (!waitForOtherCacheWrite) {
          await cache.set(cacheKey, { __WAIT_FOR_CACHE_WRITE: true });
        }

        let cacheKeyWritePromise = cacheKeyWritePromises.get(cacheKey);

        if (!cacheKeyWritePromise) {
          cacheKeyWritePromise = Promise.resolve().then(async () => {
            const resolverResult = await originalResolver(root, args, context, info);

            if (!waitForOtherCacheWrite) {
              await cache.set(cacheKey, resolverResult, {
                ttl: cacheItem.invalidate?.ttl || undefined,
              });
            }

            cacheKeyWritePromises.delete(cacheKey);

            return resolverResult;
          });
          cacheKeyWritePromises.set(cacheKey, cacheKeyWritePromise);
        }

        return cacheKeyWritePromise;
      }) as ResolversComposition;
    }

    const wrappedResolvers = composeResolvers(sourceResolvers, compositions);
    return addResolversToSchema({
      schema,
      resolvers: wrappedResolvers,
      updateResolversInPlace: true,
    });
  }
}
