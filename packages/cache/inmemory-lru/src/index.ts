import LRUCache from 'lru-cache';
import { KeyValueCache, KeyValueCacheSetOptions } from '@graphql-mesh/types';

// Based on https://github.com/apollographql/apollo-server/blob/master/packages/apollo-datasource-rest/src/HTTPCache.ts

export default class InMemoryLRUCache<V = any> implements KeyValueCache<V> {
  private store: LRUCache<string, V>;

  constructor({
    max = Infinity,
    length = (item: V) => (Array.isArray(item) || typeof item === 'string' ? item.length : 1),
    ...options
  }: LRUCache.Options<string, V> = {}) {
    this.store = new LRUCache({
      max,
      length,
      ...options,
    });
  }

  async get(key: string) {
    return this.store.get(key);
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions) {
    const maxAge = options?.ttl && options?.ttl * 1000;
    this.store.set(key, value, maxAge!);
  }

  async delete(key: string) {
    this.store.del(key);
  }
}
