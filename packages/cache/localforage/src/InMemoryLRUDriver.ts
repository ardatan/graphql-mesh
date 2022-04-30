import { createLruCache, LRUCache } from '@graphql-mesh/utils';

function nextTick() {
  // Make sure this is scheduled for next tick because LRU Cache is synchronous
  // This helps for testing multiple Mesh instances pointing to the same cache
  return new Promise(resolve => setTimeout(resolve));
}

export function createInMemoryLRUDriver(ttl?: number): LocalForageDriver {
  let lru: LRUCache;
  return {
    _driver: 'INMEMORY_LRU',

    _initStorage(options: LocalForageOptions) {
      lru = createLruCache(options.size, ttl);
    },

    async getItem<T>(key: string, callback?: (err?: any, value?: any) => void): Promise<T> {
      try {
        await nextTick();
        const value = lru.get(key);
        if (callback) {
          callback(null, value);
        }
        return value;
      } catch (err) {
        if (callback) {
          callback(err);
        }
        throw err;
      }
    },

    async setItem<T>(key: string, value: T, callback?: (err?: any, value?: any) => void): Promise<T> {
      try {
        await nextTick();
        lru.set(key, value);
        if (callback) {
          callback(null, value);
        }
        return value;
      } catch (err) {
        if (callback) {
          callback(err);
        }
        throw err;
      }
    },

    async removeItem(key: string, callback?: (err?: any) => void): Promise<void> {
      try {
        await nextTick();
        lru.delete(key);
        if (callback) {
          callback(null);
        }
      } catch (err) {
        callback(err);
        throw err;
      }
    },

    async clear(callback?: (err?: any) => void): Promise<void> {
      try {
        await nextTick();
        lru.clear();
        if (callback) {
          callback(null);
        }
      } catch (err) {
        if (callback) {
          callback(err);
        }
        throw err;
      }
    },

    async length(callback?: (err?: any, value?: number) => void): Promise<number> {
      try {
        await nextTick();
        const value = lru.size;
        if (callback) {
          callback(null, value);
        }
        return value;
      } catch (err) {
        if (callback) {
          callback(err);
        }
        throw err;
      }
    },

    async key(n: number, callback?: (err?: any, value?: string) => void): Promise<string> {
      try {
        await nextTick();
        const value = lru.keys()[n];
        if (callback) {
          callback(null, value);
        }
        return value;
      } catch (err) {
        if (callback) {
          callback(err);
        }
        throw err;
      }
    },

    async keys(callback?: (err?: any, value?: string[]) => void): Promise<string[]> {
      try {
        await nextTick();
        const value = lru.keys();
        if (callback) {
          callback(null, value);
        }
        return value;
      } catch (err) {
        if (callback) {
          callback(err);
        }
        throw err;
      }
    },

    async iterate<T>(
      iteratee: (value: T, key: string, iterationNumber: number) => any,
      callback?: (err?: any, result?: any) => void
    ): Promise<any> {
      try {
        await nextTick();
        lru.keys().forEach((key, i) => {
          iteratee(lru.get(key), key, i);
        });
        if (callback) {
          callback(null);
        }
      } catch (err) {
        if (callback) {
          callback(err);
        }
        throw err;
      }
    },
  };
}
