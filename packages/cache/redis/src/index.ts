import { KeyValueCache, KeyValueCacheSetOptions, YamlConfig } from '@graphql-mesh/types';
import Redis from 'ioredis';
import { jsonFlatStringify } from '@graphql-mesh/utils';

export default class RedisCache<V = string> implements KeyValueCache<V> {
  readonly client: Redis.Redis;

  constructor(options: YamlConfig.Transform['redis'] = {}) {
    this.client = new Redis({
      host: options.host,
      port: options.port,
      password: options.password,
      lazyConnect: true,
      enableAutoPipelining: true,
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
