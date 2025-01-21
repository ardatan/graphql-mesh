import type { KeyValueCache, KeyValueCacheSetOptions, MeshPubSub } from '@graphql-mesh/types';
import { createLruCache, type LRUCache } from '@graphql-mesh/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

export interface InMemoryLRUCacheOptions {
  max?: number;
  ttl?: number;
  pubsub?: MeshPubSub;
}

export default class InMemoryLRUCache<V = any> implements KeyValueCache<V>, Disposable {
  private lru: LRUCache;
  private timeouts = new Set<ReturnType<typeof setTimeout>>();
  constructor(options?: InMemoryLRUCacheOptions) {
    this.lru = createLruCache(options?.max, options?.ttl);
    const subId = options?.pubsub?.subscribe?.('destroy', () => {
      options?.pubsub?.unsubscribe(subId);
      this[DisposableSymbols.dispose]();
    });
  }

  get(key: string) {
    return this.lru.get(key);
  }

  set(key: string, value: any, options?: KeyValueCacheSetOptions) {
    this.lru.set(key, value);
    if (options?.ttl && options.ttl > 0) {
      const timeout = setTimeout(() => {
        this.timeouts.delete(timeout);
        this.lru.delete(key);
      }, options.ttl * 1000);
      this.timeouts.add(timeout);
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
    const keysWithPrefix = [];
    for (const key of this.lru.keys()) {
      if (key.startsWith(prefix)) {
        keysWithPrefix.push(key);
      }
    }
    return keysWithPrefix;
  }

  [DisposableSymbols.dispose]() {
    for (const timeout of this.timeouts) {
      clearTimeout(timeout);
      this.timeouts.delete(timeout);
    }
  }
}
