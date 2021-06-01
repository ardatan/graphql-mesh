import { globalLruCache } from '@graphql-mesh/utils';
import { KeyValueCache, KeyValueCacheSetOptions } from '@graphql-mesh/types';

type CacheEntry<V> = { expiresAt: number; value: V };

export default class InMemoryLRUCache<V = any> implements KeyValueCache<V> {
  private cacheIdentifier = Date.now();
  constructor({ max = Infinity } = {}) {}

  async get(key: string) {
    const entry: CacheEntry<V> = globalLruCache.get(`${this.cacheIdentifier}-${key}`);
    if (entry?.expiresAt && Date.now() > entry.expiresAt) {
      globalLruCache.delete(key);
      return undefined;
    }
    return entry?.value;
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions) {
    globalLruCache.set(`${this.cacheIdentifier}-${key}`, {
      expiresAt: options?.ttl ? Date.now() + options.ttl * 1000 : Infinity,
      value,
    });
  }

  async delete(key: string) {
    globalLruCache.delete(`${this.cacheIdentifier}-${key}`);
  }
}
