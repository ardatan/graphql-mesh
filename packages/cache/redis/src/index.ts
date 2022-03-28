import { KeyValueCache, KeyValueCacheSetOptions, MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import Redis from 'ioredis';
import { jsonFlatStringify, stringInterpolator } from '@graphql-mesh/utils';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';

function interpolateStrWithEnv(str: string): string {
  return stringInterpolator.parse(str, { env: process.env });
}

export default class RedisCache<V = string> implements KeyValueCache<V> {
  private client: Redis;

  constructor(options: YamlConfig.Transform['redis'] & { pubsub: MeshPubSub }) {
    if (options.url) {
      const redisUrl = new URL(options.url);

      redisUrl.searchParams.set('lazyConnect', 'true');
      redisUrl.searchParams.set('enableAutoPipelining', 'true');
      redisUrl.searchParams.set('enableOfflineQueue', 'true');

      if (!['redis:', 'rediss:'].includes(redisUrl.protocol)) {
        throw new Error('Redis URL must use either redis:// or rediss://');
      }

      const fullUrl = redisUrl.toString();
      const parsedFullUrl = interpolateStrWithEnv(fullUrl);

      this.client = new Redis(parsedFullUrl);
    } else {
      const parsedHost = interpolateStrWithEnv(options.host);
      const parsedPort = interpolateStrWithEnv(options.port);
      const parsedPassword = interpolateStrWithEnv(options.password);
      if (parsedHost) {
        this.client = new Redis({
          host: parsedHost,
          port: parseInt(parsedPort),
          password: parsedPassword,
          lazyConnect: true,
          enableAutoPipelining: true,
          enableOfflineQueue: true,
        });
      } else {
        return new InMemoryLRUCache() as any;
      }
    }
    options.pubsub.subscribe('destroy', () => {
      this.client.disconnect(false);
    });
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions): Promise<void> {
    const stringifiedValue = jsonFlatStringify(value);
    if (options?.ttl) {
      await this.client.set(key, stringifiedValue, 'EX', options.ttl);
    } else {
      await this.client.set(key, stringifiedValue);
    }
  }

  async get(key: string): Promise<V | undefined> {
    const reply = await this.client.get(key);
    if (reply !== null) {
      const value = JSON.parse(reply);
      return value;
    }
    return undefined;
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (e) {
      return false;
    }
  }
}
