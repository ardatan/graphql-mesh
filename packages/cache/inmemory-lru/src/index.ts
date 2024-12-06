import type { KeyValueCache, KeyValueCacheSetOptions } from '@graphql-mesh/types';
import { createLruCache, type LRUCache } from '@graphql-mesh/utils';

export interface InMemoryLRUCacheOptions {
  max?: number;
  ttl?: number;
}

export class InMemoryLRUCache<V = any> implements KeyValueCache<V> {
  private lru: LRUCache;
  private timeouts = new Set<ReturnType<typeof setTimeout>>();
  constructor(options?: InMemoryLRUCacheOptions) {
    this.lru = createLruCache(options?.max, options?.ttl);
  }

  get(key: string) {
    return this.lru.get(key);
  }

  set(key: string, value: any, options?: KeyValueCacheSetOptions) {
    this.lru.set(key, value);
    if (options?.ttl) {
      this.timeouts.add(
        setTimeout(() => {
          this.lru.delete(key);
        }, options.ttl * 1000),
      );
    }
  }

  delete(key: string) {
    try {
      this.lru.delete(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  getKeysByPrefix(prefix: string) {
    return Array.from(this.lru.keys()).filter(key => key.startsWith(prefix));
  }
}
