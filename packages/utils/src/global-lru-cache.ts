import { lru, LRU } from 'tiny-lru';

export type LRUCache = LRU<any>;

export function createLruCache(max?: number, ttl?: number): LRUCache {
  return lru(max, ttl);
}
