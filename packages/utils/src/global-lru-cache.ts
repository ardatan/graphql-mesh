import { lru, LRU } from 'tiny-lru';

export type LRUCache<T = any> = LRU<T>;

export function createLruCache<T = any>(max?: number, ttl?: number): LRUCache<T> {
  return lru(max, ttl);
}
