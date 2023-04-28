import lru, { Lru } from 'tiny-lru';

export type LRUCache<T = any> = Lru<T>;

export function createLruCache<T = any>(max?: number, ttl?: number): LRUCache<T> {
  return lru(max, ttl);
}
