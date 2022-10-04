import lru, { Lru } from 'tiny-lru';

export type LRUCache = Lru<any>;

export function createLruCache(max?: number, ttl?: number): LRUCache {
  return lru(max, ttl);
}
