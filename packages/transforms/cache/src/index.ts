import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { ResolversComposerMapping, ResolversComposition, composeResolvers } from '@graphql-tools/resolvers-composition';
import { computeCacheKey } from './compute-cache-key';
import { extractResolvers } from '@graphql-mesh/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';

export default class CacheTransform implements MeshTransform {
  noWrap = true;
  private activeRequests: {
    [cacheKey: string]: {
      complete: () => void;
      completed: Promise<void>;
    };
  } = {};

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

      compositions[cacheItem.field] = (originalResolver => async (root: any, args: any, context: any, info: any) => {
        const cacheKey = computeCacheKey({
          keyStr: cacheItem.cacheKey,
          args,
          info,
        });

        let cachedValue = await cache.get(cacheKey);

        // this needs to be a loop because last request is async
        // and we need to ensure that no other task in the event loop
        // has already started a request for the current cacheKey
        while (!cachedValue && this.activeRequests[cacheKey]) {
          await this.activeRequests[cacheKey].completed;
          cachedValue = await cache.get(cacheKey);
        }

        if (cachedValue) {
          return cachedValue;
        }

        this.startRequest(cacheKey);

        try {
          const resolverResult = await originalResolver(root, args, context, info);

          await cache.set(cacheKey, resolverResult, {
            ttl: cacheItem.invalidate?.ttl || undefined,
          });

          this.completeRequest(cacheKey);

          return resolverResult;
        } catch (error) {
          this.completeRequest(cacheKey);
          throw error;
        }
      }) as ResolversComposition;
    }

    const wrappedResolvers = composeResolvers(sourceResolvers, compositions);
    return addResolversToSchema({
      schema,
      resolvers: wrappedResolvers,
      updateResolversInPlace: true,
    });
  }

  private startRequest(cacheKey: string) {
    let resolveActiveRequestFn;
    const completed = new Promise<void>(resolve => {
      resolveActiveRequestFn = resolve;
    });

    this.activeRequests[cacheKey] = {
      complete: resolveActiveRequestFn,
      completed,
    };
  }

  private completeRequest(cacheKey: string) {
    const activeRequest = this.activeRequests[cacheKey];
    delete this.activeRequests[cacheKey];
    activeRequest.complete();
  }
}
