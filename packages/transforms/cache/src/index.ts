import { TransformFn, YamlConfig } from '@graphql-mesh/types';
import { ResolversComposerMapping, ResolversComposition, composeResolvers } from '@graphql-tools/resolvers-composition';
import { getResolversFromSchema } from '@graphql-tools/utils';
import { computeCacheKey } from './compute-cache-key';

const cacheTransform: TransformFn<YamlConfig.CacheTransformConfig[]> = async ({ config, schema, cache, hooks }) => {
  // We need to use `schemaReady` hook and not the schema directly because we need to make sure to run cache after all
  // other transformations are done, and to make sure that custom resolve are already loaded and merged into the schema
  hooks.on('schemaReady', ({ schema, applyResolvers }) => {
    const sourceResolvers = getResolversFromSchema(schema);
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
    applyResolvers(wrappedResolvers);
  });
  return schema;
};

export default cacheTransform;
