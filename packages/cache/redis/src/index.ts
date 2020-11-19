import { KeyValueCache, KeyValueCacheSetOptions } from '@graphql-mesh/types';
import Redis, { RedisOptions } from 'ioredis';
import DataLoader from 'dataloader';

export default class RedisCache<V = string> implements KeyValueCache<V> {
  readonly client: Redis.Redis;

  private loader: DataLoader<string, string | null>;

  constructor(options?: RedisOptions) {
    this.client = new Redis(options);

    this.loader = new DataLoader(keys => this.client.mget(...keys), {
      cache: false,
    });
  }

  async set(key: string, value: V, options?: KeyValueCacheSetOptions): Promise<void> {
    const ttl = options?.ttl || 300;
    const stringifiedValue = JSON.stringify(value);
    await this.client.set(key, stringifiedValue, 'EX', ttl);
  }

  async get(key: string): Promise<V | undefined> {
    const reply = await this.loader.load(key);
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
