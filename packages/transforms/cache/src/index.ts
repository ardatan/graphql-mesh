import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { ResolversComposerMapping, composeResolvers } from '@graphql-tools/resolvers-composition';
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

      const transformId = Date.now();

      compositions[cacheItem.field] = originalResolver => async (root, args, context, info) => {
        const cacheKey = computeCacheKey({
          keyStr: cacheItem.cacheKey,
          args,
          info,
        });

        const cachedValue = await cache.get(cacheKey);

        if (cachedValue) {
          return cachedValue;
        }

        const shouldWaitCacheKey = `${cacheKey}_shouldWait`;
        const pubsubTopic = `${cacheKey}_resolved`;

        const shouldWait = await cache.get(shouldWaitCacheKey);

        if (shouldWait) {
          return new Promise(resolve => {
            const subId$ = pubsub.subscribe(pubsubTopic, async data => {
              if (data) {
                subId$.then(subId => pubsub.unsubscribe(subId));
                resolve(data);
              }
            });
          });
        }

        cache.set(shouldWaitCacheKey, transformId);
        const result = await originalResolver(root, args, context, info);
        cache.set(cacheKey, result, {
          ttl: cacheItem.invalidate?.ttl,
        });
        pubsub.publish(pubsubTopic, result);
        return result;
      };
    }

    const wrappedResolvers = composeResolvers(sourceResolvers, compositions);
    return addResolversToSchema({
      schema,
      resolvers: wrappedResolvers,
      updateResolversInPlace: true,
    });
  }
}
