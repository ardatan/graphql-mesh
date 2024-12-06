/* eslint-disable @typescript-eslint/no-floating-promises */
import type { GraphQLSchema } from 'graphql';
import type { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { extractResolvers } from '@graphql-mesh/utils';
import type { ResolversComposerMapping } from '@graphql-tools/resolvers-composition';
import { composeResolvers } from '@graphql-tools/resolvers-composition';
import { addResolversToSchema } from '@graphql-tools/schema';
import type { MaybePromise } from '@graphql-tools/utils';
import { computeCacheKey } from './compute-cache-key.js';

export default class CacheTransform implements MeshTransform {
  noWrap = true;

  private readonly shouldWaitLocal: {
    [cacheKey: string]: true;
  } = {};

  constructor(private options: MeshTransformOptions<YamlConfig.CacheTransformConfig[]>) {}
  transformSchema(schema: GraphQLSchema) {
    const { config, cache } = this.options;
    const sourceResolvers = extractResolvers(schema);
    const compositions: ResolversComposerMapping = {};

    for (const cacheItem of config) {
      const effectingOperations = cacheItem.invalidate?.effectingOperations || [];

      for (const { operation, matchKey } of effectingOperations) {
        compositions[operation] = originalResolver => async (root, args, context, info) => {
          const result = await originalResolver(root, args, context, info);
          const cacheKey = computeCacheKey({
            keyStr: matchKey,
            args,
            info,
          });

          await cache.delete(cacheKey);
          return result;
        };
      }

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

        const shouldWait = await this.shouldWait(shouldWaitCacheKey);
        if (shouldWait) {
          return this.waitAndReturn(pubsubTopic);
        }

        this.setShouldWait(shouldWaitCacheKey);

        try {
          const result = await originalResolver(root, args, context, info);
          await cache.set(cacheKey, result, {
            ttl: cacheItem.invalidate?.ttl,
          });

          // do not await setting the cache here, otherwise we would delay returnig the result unnecessarily
          // instead await as part of shouldWait cleanup
          const setCachePromise = this.options.cache.set(cacheKey, result, {
            ttl: cacheItem.invalidate?.ttl,
          });

          // do not wait for cleanup to complete
          this.cleanupShouldWait({
            shouldWaitCacheKey,
            pubsubTopic,
            data: { result },
            setCachePromise,
          });

          return result;
        } catch (error) {
          this.cleanupShouldWait({
            shouldWaitCacheKey,
            pubsubTopic,
            data: { error },
          });
          throw error;
        }
      };
    }

    const wrappedResolvers = composeResolvers(sourceResolvers, compositions);
    return addResolversToSchema({
      schema,
      resolvers: wrappedResolvers,
      updateResolversInPlace: true,
    });
  }

  private async shouldWait(shouldWaitCacheKey: string) {
    // this is to prevent a call to a the cache (which might be distributed)
    // when the should wait was set from current instance
    const shouldWaitLocal = this.shouldWaitLocal[shouldWaitCacheKey];
    if (shouldWaitLocal) {
      return true;
    }

    const shouldWaitGlobal = await this.options.cache.get(shouldWaitCacheKey);
    if (shouldWaitGlobal) {
      return true;
    }

    // requried to be called after async check to eliminate local race condition
    return this.shouldWaitLocal[shouldWaitCacheKey];
  }

  private setShouldWait(shouldWaitCacheKey: string) {
    this.options.cache.set(shouldWaitCacheKey, true);
    this.shouldWaitLocal[shouldWaitCacheKey] = true;
  }

  private async cleanupShouldWait({
    shouldWaitCacheKey,
    pubsubTopic,
    data,
    setCachePromise,
  }: {
    shouldWaitCacheKey: string;
    pubsubTopic: string;
    data: { result: unknown } | { error: unknown };
    setCachePromise?: MaybePromise<void>;
  }) {
    if (setCachePromise) {
      // we need to wait for cache to be filled before removing the shouldWait
      await setCachePromise;
    }

    // the below order is deliberate and important
    // we need to delete the shouldWait keys first
    // this ensures that no new subscriptions for topic are created after publish is called
    // since the cache is async we need to await the delete
    await this.options.cache.delete(shouldWaitCacheKey);
    delete this.shouldWaitLocal[shouldWaitCacheKey];
    this.options.pubsub.publish(pubsubTopic, data);
  }

  private waitAndReturn(pubsubTopic: string) {
    return new Promise((resolve, reject) => {
      const subId = this.options.pubsub.subscribe(pubsubTopic, ({ result, error }) => {
        this.options.pubsub.unsubscribe(subId);

        if (error) {
          reject(error);
        }

        if (result) {
          resolve(result);
        }
      });
    });
  }
}
