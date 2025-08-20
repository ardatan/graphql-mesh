import {
  toMeshPubSub,
  type HivePubSub,
  type KeyValueCache,
  type KeyValueCacheSetOptions,
  type MeshPubSub,
} from '@graphql-mesh/types';
import { createLruCache, type LRUCache } from '@graphql-mesh/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

export interface InMemoryLRUCacheOptions {
  max?: number;
  ttl?: number;
  pubsub?: MeshPubSub | HivePubSub;
}

export default class InMemoryLRUCache<V = any> implements KeyValueCache<V>, Disposable {
  private lru: LRUCache;
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  constructor(options?: InMemoryLRUCacheOptions) {
    this.lru = createLruCache(options?.max, options?.ttl);
    const pubsub = toMeshPubSub(options?.pubsub);
    const subId = pubsub.subscribe?.('destroy', () => {
      pubsub.unsubscribe(subId);
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
        this.timeouts.delete(key);
        this.lru.delete(key);
      }, options.ttl * 1000);
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        // we debounce the timeout because we dont want to "pull the rug" from a "parallel" get
        clearTimeout(existingTimeout);
      }
      this.timeouts.set(key, timeout);
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
    // clear all timeouts and then empty the map
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }
}
