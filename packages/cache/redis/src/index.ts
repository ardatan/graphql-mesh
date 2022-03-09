import { KeyValueCache, KeyValueCacheSetOptions, YamlConfig } from '@graphql-mesh/types';
import Redis from 'ioredis';
import { jsonFlatStringify, stringInterpolator } from '@graphql-mesh/utils';
import DataLoader from 'dataloader';
import { URL } from 'url';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';

function interpolateStrWithEnv(str: string): string {
  return stringInterpolator.parse(str, { env: process.env });
}

export default class RedisCache<V = string> implements KeyValueCache<V> {
  private client: Redis.Redis;

  constructor(options: YamlConfig.Transform['redis'] = {}) {
    let redisClient: Redis.Redis;

    if (options.url) {
      const redisUrl = new URL(options.url);

      redisUrl.searchParams.set('lazyConnect', 'true');
      redisUrl.searchParams.set('enableAutoPipelining', 'true');

      if (!['redis:', 'rediss:'].includes(redisUrl.protocol)) {
        throw new Error('Redis URL must use either redis:// or rediss://');
      }

      const fullUrl = redisUrl.toString();
      const parsedFullUrl = interpolateStrWithEnv(fullUrl);

      redisClient = new Redis(parsedFullUrl);
    } else {
      const parsedHost = interpolateStrWithEnv(options.host);
      const parsedPort = interpolateStrWithEnv(options.port);
      const parsedPassword = interpolateStrWithEnv(options.password);
      if (parsedHost) {
        redisClient = new Redis({
          host: parsedHost,
          port: parseInt(parsedPort),
          password: parsedPassword,
          lazyConnect: true,
          enableAutoPipelining: true,
        });
      } else {
        return new InMemoryLRUCache() as any;
      }
    }

    const dataLoader = new DataLoader<string[], [any, string]>(async (commands: string[][]) => {
      const responses = await redisClient.pipeline(commands).exec();
      return responses.map(([err, data]) => {
        if (err) {
          return err;
        }
        return data;
      });
    });
    this.client = new Proxy(redisClient, {
      get:
        (_, methodName: keyof Redis.Redis) =>
        (...args: string[]) =>
          dataLoader.load([methodName, ...args]),
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
