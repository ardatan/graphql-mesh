import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type {
  KeyValueCache,
  KeyValueCacheSetOptions,
  Logger,
  MeshPubSub,
  YamlConfig,
} from '@graphql-mesh/types';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

function interpolateStrWithEnv(str: string): string {
  return stringInterpolator.parse(str, { env: process.env });
}

export default class RedisCache<V = string> implements KeyValueCache<V>, Disposable {
  private client: Redis;

  constructor(options: YamlConfig.Cache['redis'] & { pubsub?: MeshPubSub; logger: Logger }) {
    const lazyConnect = options.lazyConnect !== false;
    if (options.url) {
      const redisUrl = new URL(interpolateStrWithEnv(options.url));

      if (!['redis:', 'rediss:'].includes(redisUrl.protocol)) {
        throw new Error('Redis URL must use either redis:// or rediss://');
      }

      if (lazyConnect) {
        redisUrl.searchParams.set('lazyConnect', 'true');
      }

      redisUrl.searchParams.set('enableAutoPipelining', 'true');
      redisUrl.searchParams.set('enableOfflineQueue', 'true');

      options.logger.debug(`Connecting to Redis at ${redisUrl.toString()}`);
      this.client = new Redis(redisUrl?.toString());
    } else {
      const parsedHost = interpolateStrWithEnv(options.host?.toString()) || process.env.REDIS_HOST;
      const parsedPort = interpolateStrWithEnv(options.port?.toString()) || process.env.REDIS_PORT;
      const parsedPassword =
        interpolateStrWithEnv(options.password?.toString()) || process.env.REDIS_PASSWORD;
      const parsedDb = interpolateStrWithEnv(options.db?.toString()) || process.env.REDIS_DB;
      const numPort = parseInt(parsedPort);
      const numDb = parseInt(parsedDb);
      if (parsedHost) {
        options.logger.debug(`Connecting to Redis at ${parsedHost}:${parsedPort}`);
        this.client = new Redis({
          host: parsedHost,
          port: isNaN(numPort) ? undefined : numPort,
          password: parsedPassword,
          db: isNaN(numDb) ? undefined : numDb,
          ...(lazyConnect ? { lazyConnect: true } : {}),
          enableAutoPipelining: true,
          enableOfflineQueue: true,
        });
      } else {
        options.logger.debug(`Connecting to Redis mock`);
        this.client = new RedisMock();
      }
    }
    // TODO: PubSub.destroy will no longer be needed after v0
    const id = options.pubsub?.subscribe('destroy', () => {
      this.client.disconnect(false);
      options.pubsub.unsubscribe(id);
    });
  }

  [DisposableSymbols.dispose](): void {
    this.client.disconnect();
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

  async getKeysByPrefix(prefix: string): Promise<string[]> {
    return this.client.keys(`${prefix}*`);
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
