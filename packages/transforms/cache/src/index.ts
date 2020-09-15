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
    const { config, hooks, cache } = this.options;
    const sourceResolvers = extractResolvers(schema);
    const compositions: ResolversComposerMapping = {};

    for (const cacheItem of config) {
      const effectingOperations = cacheItem.invalidate?.effectingOperations || [];

      if (effectingOperations.length > 0) {
        hooks.on('resolverDone', async resolverInfo => {
          const effectingRule = effectingOperations.find(
            o => o.operation === `${resolverInfo.info.parentType.name}.${resolverInfo.info.fieldName}`
          );

          if (effectingRule) {
            const cacheKey = computeCacheKey({
              keyStr: effectingRule.matchKey,
              args: resolverInfo.args,
              info: resolverInfo.info,
            });

            await cache.delete(cacheKey);
          }
        });
      }

      compositions[cacheItem.field] = (originalResolver => async (root: any, args: any, context: any, info: any) => {
        const cacheKey = computeCacheKey({
          keyStr: cacheItem.cacheKey,
          args,
          info,
        });

        const cachedValue = await cache.get(cacheKey);

        if (cachedValue) {
          return cachedValue;
        }

        const resolverResult = await originalResolver(root, args, context, info);

        await cache.set(cacheKey, resolverResult, {
          ttl: cacheItem.invalidate?.ttl || undefined,
        });

        return resolverResult;
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
