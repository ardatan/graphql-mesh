import lru, { Lru } from 'tiny-lru';

export function createLruCache(max?: number, ttl?: number) {
  return lru(max, ttl);
}

export type LRUCache = Lru;
