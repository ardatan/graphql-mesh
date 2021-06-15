import { KeyValueCache, KeyValueCacheSetOptions, YamlConfig } from '@graphql-mesh/types';
import Redis from 'ioredis';
import { jsonFlatStringify } from '@graphql-mesh/utils';
import DataLoader from 'dataloader';

export default class RedisCache<V = string> implements KeyValueCache<V> {
  private client: Redis.Redis;

  constructor(options: YamlConfig.Transform['redis'] = {}) {
    const redisClient = new Redis({
      host: options.host,
      port: options.port,
      password: options.password,
      lazyConnect: true,
      enableAutoPipelining: true,
    });
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
