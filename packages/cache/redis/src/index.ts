import { KeyValueCache, KeyValueCacheSetOptions, MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import Redis from 'ioredis';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import LocalforageCache from '@graphql-mesh/cache-localforage';
import { process } from '@graphql-mesh/cross-helpers';

function interpolateStrWithEnv(str: string): string {
  return stringInterpolator.parse(str, { env: process.env });
}

export default class RedisCache<V = string> implements KeyValueCache<V> {
  private client: Redis;

  constructor(options: YamlConfig.Cache['redis'] & { pubsub: MeshPubSub }) {
    if (options.url) {
      const redisUrl = new URL(interpolateStrWithEnv(options.url));

      redisUrl.searchParams.set('lazyConnect', 'true');
      redisUrl.searchParams.set('enableAutoPipelining', 'true');
      redisUrl.searchParams.set('enableOfflineQueue', 'true');

      if (!['redis:', 'rediss:'].includes(redisUrl.protocol)) {
        throw new Error('Redis URL must use either redis:// or rediss://');
      }

      this.client = new Redis(redisUrl.toString());
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
        return new LocalforageCache(options as any) as any;
      }
    }
    const id = options.pubsub.subscribe('destroy', () => {
      this.client.disconnect(false);
      options.pubsub.unsubscribe(id);
    });
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions): Promise<void> {
    const stringifiedValue = JSON.stringify(value);
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
