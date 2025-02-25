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
    if ('sentinels' in options) {
      this.client = new Redis({
        name: options.name,
        sentinelPassword:
          options.sentinelPassword && interpolateStrWithEnv(options.sentinelPassword),
        sentinels: options.sentinels.map(s => ({
          host: s.host && interpolateStrWithEnv(s.host),
          port: s.port && parseInt(interpolateStrWithEnv(s.port)),
          family: s.family && parseInt(interpolateStrWithEnv(s.family)),
        })),
        role: options.role,
        enableTLSForSentinelMode: options.enableTLSForSentinelMode,
        enableAutoPipelining: true,
        enableOfflineQueue: true,
        lazyConnect,
      });
    } else if (options.url) {
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
      options.logger.debug(`Connecting to Redis at ${urlStr}`);
      this.client = new Redis(urlStr);
    } else {
      const parsedHost = interpolateStrWithEnv(options.host?.toString()) || process.env.REDIS_HOST;
      const parsedPort = interpolateStrWithEnv(options.port?.toString()) || process.env.REDIS_PORT;
      const parsedUsername =
        interpolateStrWithEnv(options.username?.toString()) || process.env.REDIS_USERNAME;
      const parsedPassword =
        interpolateStrWithEnv(options.password?.toString()) || process.env.REDIS_PASSWORD;
      const parsedDb = interpolateStrWithEnv(options.db?.toString()) || process.env.REDIS_DB;
      const parsedFamily =
        interpolateStrWithEnv(options.family?.toString()) || process.env.REDIS_FAMILY;
      const numPort = parseInt(parsedPort);
      const numDb = parseInt(parsedDb);
      if (parsedHost) {
        options.logger.debug(`Connecting to Redis at ${parsedHost}:${parsedPort}`);
        this.client = new Redis({
          host: parsedHost,
          port: isNaN(numPort) ? undefined : numPort,
          username: parsedUsername,
          password: parsedPassword,
          db: isNaN(numDb) ? undefined : numDb,
          family: parsedFamily === '6' ? 6 : undefined,
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
    this.client.disconnect(false);
  }

  set(key: string, value: V, options?: KeyValueCacheSetOptions): Promise<any> {
    const stringifiedValue = JSON.stringify(value);
    if (options?.ttl && options.ttl > 0) {
      return this.client.set(key, stringifiedValue, 'PX', options.ttl * 1000);
    } else {
      return this.client.set(key, stringifiedValue);
    }
  }

  get(key: string): Promise<V | undefined> {
    return this.client.get(key).then(value => (value != null ? JSON.parse(value) : undefined));
  }

  getKeysByPrefix(prefix: string): Promise<string[]> {
    return scanPatterns(this.client, `${prefix}*`);
  }

  delete(key: string): Promise<boolean> {
    return this.client.del(key).then(
      value => value > 0,
      () => false,
    );
  }
}

function scanPatterns(redis: Redis, pattern: string, cursor: string = '0', keys: string[] = []) {
  return redis.scan(cursor, 'MATCH', pattern, 'COUNT', '10').then(([nextCursor, nextKeys]) => {
    keys.push(...nextKeys);
    if (nextCursor === '0') {
      return keys;
    }
    return scanPatterns(redis, pattern, nextCursor, keys);
  });
}
