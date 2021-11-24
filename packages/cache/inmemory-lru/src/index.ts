import { globalLruCache } from '@graphql-mesh/utils';
import { KeyValueCache, KeyValueCacheSetOptions } from '@graphql-mesh/types';

type CacheEntry<V> = { expiresAt: number; value: V };

export default class InMemoryLRUCache<V = any> implements KeyValueCache<V> {
  private cacheIdentifier = Date.now();
  constructor({ max = Infinity } = {}) {}

  private nextTick() {
    // Make sure this is scheduled for next tick because LRU Cache is synchronous
    // This helps for testing multiple Mesh instances pointing to the same cache
    return new Promise(resolve => setTimeout(resolve));
  }

  async get(key: string) {
    await this.nextTick();
    const entry: CacheEntry<V> = globalLruCache.get(`${this.cacheIdentifier}-${key}`);
    if (entry?.expiresAt && Date.now() > entry.expiresAt) {
      globalLruCache.delete(key);
      return undefined;
    }
    return entry?.value;
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions) {
    await this.nextTick();
    globalLruCache.set(`${this.cacheIdentifier}-${key}`, {
      expiresAt: options?.ttl ? Date.now() + options.ttl * 1000 : Infinity,
      value,
    });
  }

  async delete(key: string) {
    await this.nextTick();
    globalLruCache.delete(`${this.cacheIdentifier}-${key}`);
  }
}
