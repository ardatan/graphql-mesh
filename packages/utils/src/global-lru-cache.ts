import { lru } from 'tiny-lru';

export type LRUCache = ReturnType<typeof lru>;

export function createLruCache(max?: number, ttl?: number): LRUCache {
  return lru(max, ttl);
}
