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
import { mapMaybePromise } from '@graphql-mesh/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

function interpolateStrWithEnv(str: string): string {
  return stringInterpolator.parse(str, { env: process.env });
}

export default class RedisCache<V = string> implements KeyValueCache<V>, Disposable {
  private client: Redis;
  private logger: Logger;

  constructor(options: YamlConfig.Cache['redis'] & { pubsub?: MeshPubSub; logger: Logger }) {
    this.logger = options.logger;
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
      const IPV6_REGEX =
        /^(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?$/gm;
      if (IPV6_REGEX.test(redisUrl.hostname)) {
        redisUrl.searchParams.set('family', '6');
      }
      const urlStr = redisUrl.toString();
      this.logger.debug(`Connecting to Redis at ${urlStr}`);
      this.client = new Redis(urlStr);
    } else {
      const parsedHost = interpolateStrWithEnv(options.host?.toString()) || process.env.REDIS_HOST;
      const parsedPort = interpolateStrWithEnv(options.port?.toString()) || process.env.REDIS_PORT;
      const parsedUsername =
        interpolateStrWithEnv(options.username?.toString()) || process.env.REDIS_USERNAME;
      const parsedPassword =
        interpolateStrWithEnv(options.password?.toString()) || process.env.REDIS_PASSWORD;
      const parsedDb = interpolateStrWithEnv(options.db?.toString()) || process.env.REDIS_DB;
      const numPort = parseInt(parsedPort);
      const numDb = parseInt(parsedDb);
      if (parsedHost) {
        this.logger.debug(`Connecting to Redis at ${parsedHost}:${parsedPort}`);
        this.client = new Redis({
          host: parsedHost,
          port: isNaN(numPort) ? undefined : numPort,
          username: parsedUsername,
          password: parsedPassword,
          db: isNaN(numDb) ? undefined : numDb,
          ...(lazyConnect ? { lazyConnect: true } : {}),
          enableAutoPipelining: true,
          enableOfflineQueue: true,
        });
      } else {
        this.logger.debug(`Connecting to Redis mock`);
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
    this.client.disconnect(false);
  }

  set(key: string, value: V, options?: KeyValueCacheSetOptions): Promise<any> {
    const stringifiedValue = JSON.stringify(value);
    if (options?.ttl && options.ttl > 0) {
      this.logger.debug(
        `Caching using key "${key}" with ${options.ttl * 1000}s TTL`,
        stringifiedValue,
      );
      return this.client.set(key, stringifiedValue, 'PX', options.ttl * 1000);
    } else {
      this.logger.debug(`Caching using key "${key}"`, stringifiedValue);
      return this.client.set(key, stringifiedValue);
    }
  }

  get(key: string): Promise<V | undefined> {
    this.logger.debug(`Getting "${key}" from cache`);
    return mapMaybePromise(this.client.get(key), value => {
      const val = value != null ? JSON.parse(value) : undefined;
      if (val) {
        this.logger.debug(`Cache hit using "${key}"`, val);
      } else {
        this.logger.debug(`Cache miss using "${key}"`);
      }
      return val;
    });
  }

  getKeysByPrefix(prefix: string): Promise<string[]> {
    return scanPatterns(this.client, `${prefix}*`);
  }

  delete(key: string): PromiseLike<boolean> | boolean {
    try {
      this.logger.debug(`Deleting "${key}" from cache`);
      return mapMaybePromise(
        this.client.del(key),
        value => value > 0,
        e => {
          this.logger.error(`Error deleting "${key}" from cache`, e);
          return false;
        },
      );
    } catch (e) {
      this.logger.error(`Error trying to delete "${key}" from cache`, e);
      return false;
    }
  }
}

function scanPatterns(redis: Redis, pattern: string, cursor: string = '0', keys: string[] = []) {
  return mapMaybePromise(
    redis.scan(cursor, 'MATCH', pattern, 'COUNT', '10'),
    ([nextCursor, nextKeys]) => {
      keys.push(...nextKeys);
      if (nextCursor === '0') {
        return keys;
      }
      return scanPatterns(redis, pattern, nextCursor, keys);
    },
  );
}
