import { process } from '@graphql-mesh/cross-helpers';
import type { KeyValueCache } from '@graphql-mesh/types';
import { Redis, type RedisConfigNodejs } from '@upstash/redis';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

export default class UpstashRedisCache implements KeyValueCache {
  private redis: Redis;
  private abortCtrl = new AbortController();
  constructor(config?: Partial<RedisConfigNodejs>) {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      enableAutoPipelining: true,
      signal: this.abortCtrl.signal,
      latencyLogging: !!process.env.DEBUG,
      ...config,
    });
  }

  get<T>(key: string) {
    return this.redis.get<T>(key);
  }

  set<T>(key: string, value: T, options?: { ttl?: number }) {
    if (options?.ttl) {
      return this.redis.set(key, value, {
        px: options.ttl * 1000,
      });
    } else {
      return this.redis.set(key, value);
    }
  }

  delete(key: string) {
    return this.redis.del(key).then(num => num > 0);
  }

  async getKeysByPrefix(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await this.redis.scan(cursor, {
        match: prefix + '*',
        count: 100,
      });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    return keys;
  }

  [DisposableSymbols.dispose]() {
    return this.abortCtrl.abort();
  }
}
