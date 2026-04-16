import Redis, { type Cluster } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { defaultProvider as defaultAwsCredentialsProvider } from '@aws-sdk/credential-provider-node';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import {
  toMeshPubSub,
  type HivePubSub,
  type KeyValueCache,
  type KeyValueCacheSetOptions,
  type Logger,
  type MeshPubSub,
  type YamlConfig,
} from '@graphql-mesh/types';
import { trace, type Tracer } from '@opentelemetry/api';
import { Hash } from '@smithy/hash-node';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

function interpolateStrWithEnv(str: string): string {
  return stringInterpolator.parse(str, { env: process.env });
}

type RedisIAMServiceName = 'elasticache' | 'memorydb';

type RedisIAMConfig = {
  username?: string;
  region: string;
  serviceName?: RedisIAMServiceName;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  tokenExpirationSeconds?: number;
};

type RedisCacheOptions = YamlConfig.Cache['redis'] & {
  iam?: RedisIAMConfig;
  pubsub?: MeshPubSub | HivePubSub;
  logger: Logger;
};

export default class RedisCache<V = string> implements KeyValueCache<V>, Disposable {
  private client?: Redis | Cluster;
  private client$: Promise<Redis | Cluster>;
  private tracer: Tracer;

  constructor(options: RedisCacheOptions) {
    this.tracer = trace.getTracer('hive.cache.redis');
    if (options.iam) {
      if ('sentinels' in options) {
        throw new Error(
          'Redis IAM authentication is not supported with Sentinel mode. Use single-node (host/port or URL) or cluster configurations.',
        );
      }
      this.client$ = this.tracer.startActiveSpan('hive.cache.redis.init', span =>
        this.buildClient(options)
          .then(client => {
            this.client = client;
            return client;
          })
          .finally(() => {
            span.end();
          }),
      );
    } else {
      this.client = this.tracer.startActiveSpan('hive.cache.redis.init', span => {
        try {
          return this.buildClientWithoutIAM(options);
        } finally {
          span.end();
        }
      });
      this.client$ = Promise.resolve(this.client);
    }
    const pubsub = toMeshPubSub(options.pubsub);
    // TODO: PubSub.destroy will no longer be needed after v0
    const id = pubsub?.subscribe('destroy', () => {
      this.getClient()
        .then(client => {
          client.disconnect(false);
          pubsub.unsubscribe(id);
        })
        .catch(() => undefined);
    });
  }

  [DisposableSymbols.dispose](): void {
    if (this.client) {
      this.client.disconnect(false);
      return;
    }
    this.client$
      .then(client => {
        client.disconnect(false);
      })
      .catch(() => undefined);
  }

  private async getClient(): Promise<Redis | Cluster> {
    return this.client ?? this.client$;
  }

  private buildClientWithoutIAM(options: RedisCacheOptions): Redis | Cluster {
    const lazyConnect = options.lazyConnect !== false;
    if ('startupNodes' in options) {
      const parsedUsername =
        interpolateStrWithEnv(options.username?.toString()) || process.env.REDIS_USERNAME;
      const parsedPassword =
        interpolateStrWithEnv(options.password?.toString()) || process.env.REDIS_PASSWORD;
      const parsedDb = interpolateStrWithEnv(options.db?.toString()) || process.env.REDIS_DB;
      const numDb = parseInt(parsedDb);
      return new Redis.Cluster(
        options.startupNodes.map(s => ({
          host: s.host && interpolateStrWithEnv(s.host),
          port: s.port && parseInt(interpolateStrWithEnv(s.port)),
          family: s.family && parseInt(interpolateStrWithEnv(s.family)),
        })),
        {
          dnsLookup: options.dnsLookupAsIs ? (address, callback) => callback(null, address) : undefined,
          redisOptions: {
            username: parsedUsername,
            password: parsedPassword,
            db: isNaN(numDb) ? undefined : numDb,
            enableAutoPipelining: true,
            ...(lazyConnect ? { lazyConnect: true } : {}),
            tls: options.tls ? {} : undefined,
          },
          enableAutoPipelining: true,
          enableOfflineQueue: true,
          ...(lazyConnect ? { lazyConnect: true } : {}),
        },
      );
    } else if ('sentinels' in options) {
      return new Redis({
        name: options.name,
        sentinelPassword: options.sentinelPassword && interpolateStrWithEnv(options.sentinelPassword),
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
      safelyLogURL(options.logger, urlStr);
      return new Redis(urlStr);
    } else {
      const parsedHost = interpolateStrWithEnv(options.host?.toString()) || process.env.REDIS_HOST;
      const parsedPort = interpolateStrWithEnv(options.port?.toString()) || process.env.REDIS_PORT;
      const parsedUsername =
        interpolateStrWithEnv(options.username?.toString()) || process.env.REDIS_USERNAME;
      const parsedPassword =
        interpolateStrWithEnv(options.password?.toString()) || process.env.REDIS_PASSWORD;
      const parsedDb = interpolateStrWithEnv(options.db?.toString()) || process.env.REDIS_DB;
      const parsedFamily = interpolateStrWithEnv(options.family?.toString()) || process.env.REDIS_FAMILY;
      const numPort = parseInt(parsedPort);
      const numDb = parseInt(parsedDb);
      if (parsedHost) {
        options.logger.debug(`Connecting to Redis at ${parsedHost}:${parsedPort}`);
        return new Redis({
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
      }
      options.logger.debug(`Connecting to Redis mock`);
      return new RedisMock();
    }
  }

  private async buildClient(options: RedisCacheOptions): Promise<Redis | Cluster> {
    const lazyConnect = options.lazyConnect !== false;
    if ('startupNodes' in options) {
      let parsedUsername =
        interpolateStrWithEnv(options.username?.toString()) || process.env.REDIS_USERNAME;
      let parsedPassword =
        interpolateStrWithEnv(options.password?.toString()) || process.env.REDIS_PASSWORD;
      const parsedDb = interpolateStrWithEnv(options.db?.toString()) || process.env.REDIS_DB;
      const numDb = parseInt(parsedDb);
      if (options.iam) {
        const iamConfig = parseRedisIAMConfig(options.iam);
        parsedUsername = interpolateStrWithEnv(options.iam.username || parsedUsername);
        if (!parsedUsername) {
          throw new Error(
            'Redis IAM authentication requires a username via iam.username, username or REDIS_USERNAME.',
          );
        }
        // The IAM token is signed for the first startup node; all cluster nodes accept
        // tokens issued against the cluster's primary/configuration endpoint.
        const firstNode = options.startupNodes[0];
        if (!firstNode?.host) {
          throw new Error(
            'Redis IAM authentication with cluster mode requires at least one startup node with a host.',
          );
        }
        const nodeHost = interpolateStrWithEnv(firstNode.host);
        const rawPort = firstNode.port ? parseInt(interpolateStrWithEnv(firstNode.port)) : NaN;
        parsedPassword = await generateRedisIAMToken({
          host: nodeHost,
          port: !Number.isNaN(rawPort) ? rawPort : undefined,
          iamConfig,
          username: parsedUsername,
        });
      }
      return new Redis.Cluster(
        options.startupNodes.map(s => ({
          host: s.host && interpolateStrWithEnv(s.host),
          port: s.port && parseInt(interpolateStrWithEnv(s.port)),
          family: s.family && parseInt(interpolateStrWithEnv(s.family)),
        })),
        {
          dnsLookup: options.dnsLookupAsIs ? (address, callback) => callback(null, address) : undefined,
          redisOptions: {
            username: parsedUsername,
            password: parsedPassword,
            db: isNaN(numDb) ? undefined : numDb,
            enableAutoPipelining: true,
            ...(lazyConnect ? { lazyConnect: true } : {}),
            tls: options.tls || options.iam ? {} : undefined,
          },
          enableAutoPipelining: true,
          enableOfflineQueue: true,
          ...(lazyConnect ? { lazyConnect: true } : {}),
        },
      );
    } else if ('sentinels' in options) {
      throw new Error(
        'Redis IAM authentication is not supported with Sentinel mode.',
      );
    } else if (options.url) {
      const redisUrl = new URL(interpolateStrWithEnv(options.url));

      if (!['redis:', 'rediss:'].includes(redisUrl.protocol)) {
        throw new Error('Redis URL must use either redis:// or rediss://');
      }

      if (options.iam) {
        if (redisUrl.protocol !== 'rediss:') {
          throw new Error('Redis IAM authentication requires rediss:// URLs.');
        }
        const iamConfig = parseRedisIAMConfig(options.iam);
        const username = interpolateStrWithEnv(options.iam.username || decodeURIComponent(redisUrl.username));
        if (!username) {
          throw new Error(
            'Redis IAM authentication requires a username via iam.username or in the redis URL.',
          );
        }
        const token = await generateRedisIAMToken({
          host: redisUrl.hostname,
          port: redisUrl.port ? parseInt(redisUrl.port) : undefined,
          iamConfig,
          username,
        });
        redisUrl.username = username;
        redisUrl.password = token;
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
      safelyLogURL(options.logger, urlStr);
      return new Redis(urlStr);
    } else {
      const parsedHost = interpolateStrWithEnv(options.host?.toString()) || process.env.REDIS_HOST;
      const parsedPort = interpolateStrWithEnv(options.port?.toString()) || process.env.REDIS_PORT;
      let parsedUsername =
        interpolateStrWithEnv(options.username?.toString()) || process.env.REDIS_USERNAME;
      let parsedPassword =
        interpolateStrWithEnv(options.password?.toString()) || process.env.REDIS_PASSWORD;
      const parsedDb = interpolateStrWithEnv(options.db?.toString()) || process.env.REDIS_DB;
      const parsedFamily = interpolateStrWithEnv(options.family?.toString()) || process.env.REDIS_FAMILY;
      const numPort = parseInt(parsedPort);
      const numDb = parseInt(parsedDb);
      if (parsedHost) {
        if (options.iam) {
          const iamConfig = parseRedisIAMConfig(options.iam);
          parsedUsername = interpolateStrWithEnv(options.iam.username || parsedUsername);
          if (!parsedUsername) {
            throw new Error(
              'Redis IAM authentication requires a username via iam.username, username or REDIS_USERNAME.',
            );
          }
          parsedPassword = await generateRedisIAMToken({
            host: parsedHost,
            port: !Number.isNaN(numPort) ? numPort : undefined,
            iamConfig,
            username: parsedUsername,
          });
        }
        options.logger.debug(`Connecting to Redis at ${parsedHost}:${parsedPort}`);
        return new Redis({
          host: parsedHost,
          port: isNaN(numPort) ? undefined : numPort,
          username: parsedUsername,
          password: parsedPassword,
          db: isNaN(numDb) ? undefined : numDb,
          family: parsedFamily === '6' ? 6 : undefined,
          ...(lazyConnect ? { lazyConnect: true } : {}),
          enableAutoPipelining: true,
          enableOfflineQueue: true,
          tls: options.iam ? {} : undefined,
        });
      }
      if (options.iam) {
        throw new Error('Redis IAM authentication requires a Redis host or URL configuration.');
      }
      options.logger.debug(`Connecting to Redis mock`);
      return new RedisMock();
    }
  }

  set(key: string, value: V, options?: KeyValueCacheSetOptions): Promise<any> {
    return this.tracer.startActiveSpan('hive.cache.set', async span => {
      try {
        const stringifiedValue = JSON.stringify(value);
        const client = await this.getClient();
        if (options?.ttl && options.ttl > 0) {
          return await client.set(key, stringifiedValue, 'PX', options.ttl * 1000);
        } else {
          return await client.set(key, stringifiedValue);
        }
      } finally {
        span.end();
      }
    });
  }

  get(key: string): Promise<V | undefined> {
    return this.tracer.startActiveSpan('hive.cache.get', span =>
      this.getClient()
        .then(client => client.get(key))
        .then(value => (value != null ? JSON.parse(value) : undefined))
        .finally(() => span.end()),
    );
  }

  getKeysByPrefix(prefix: string): Promise<string[]> {
    return this.getClient().then(client => scanPatterns(client, `${prefix}*`));
  }

  delete(key: string): Promise<boolean> {
    return this.tracer.startActiveSpan('hive.cache.delete', span =>
      this.getClient()
        .then(client => client.del(key))
        .then(
          value => value > 0,
          () => false,
        )
        .finally(() => span.end()),
    );
  }
}

function parseRedisIAMConfig(iamConfig: RedisIAMConfig): RedisIAMConfig {
  const region = interpolateStrWithEnv(iamConfig.region);
  if (!region) {
    throw new Error('Redis IAM authentication requires iam.region.');
  }
  const serviceName = (iamConfig.serviceName &&
    interpolateStrWithEnv(iamConfig.serviceName)) as RedisIAMServiceName | undefined;
  const tokenExpirationSeconds = iamConfig.tokenExpirationSeconds
    ? parseInt(interpolateStrWithEnv(iamConfig.tokenExpirationSeconds.toString()))
    : undefined;
  return {
    ...iamConfig,
    region,
    username: iamConfig.username && interpolateStrWithEnv(iamConfig.username),
    serviceName,
    accessKeyId: iamConfig.accessKeyId && interpolateStrWithEnv(iamConfig.accessKeyId),
    secretAccessKey:
      iamConfig.secretAccessKey && interpolateStrWithEnv(iamConfig.secretAccessKey),
    sessionToken: iamConfig.sessionToken && interpolateStrWithEnv(iamConfig.sessionToken),
    tokenExpirationSeconds:
      tokenExpirationSeconds && !isNaN(tokenExpirationSeconds) ? tokenExpirationSeconds : undefined,
  };
}

function getRedisIAMCredentialsProvider(iamConfig: RedisIAMConfig) {
  if (iamConfig.accessKeyId || iamConfig.secretAccessKey) {
    if (!iamConfig.accessKeyId || !iamConfig.secretAccessKey) {
      throw new Error(
        'Redis IAM authentication requires both iam.accessKeyId and iam.secretAccessKey when explicit credentials are used.',
      );
    }
    return async () => ({
      accessKeyId: iamConfig.accessKeyId!,
      secretAccessKey: iamConfig.secretAccessKey!,
      sessionToken: iamConfig.sessionToken,
    });
  }
  return defaultAwsCredentialsProvider();
}

async function generateRedisIAMToken({
  host,
  port,
  iamConfig,
  username,
}: {
  host: string;
  port?: number;
  iamConfig: RedisIAMConfig;
  username: string;
}): Promise<string> {
  const credentialsProvider = getRedisIAMCredentialsProvider(iamConfig);
  const signer = new SignatureV4({
    credentials: credentialsProvider,
    service: iamConfig.serviceName || 'elasticache',
    region: iamConfig.region,
    sha256: Hash.bind(null, 'sha256'),
  });
  const signedRequest = await signer.presign(
    new HttpRequest({
      protocol: 'https:',
      hostname: host,
      port,
      method: 'GET',
      path: '/',
      query: {
        Action: 'connect',
        User: username,
      },
      headers: {
        host: port ? `${host}:${port}` : host,
      },
    }),
    {
      expiresIn: iamConfig.tokenExpirationSeconds || 900,
    },
  );
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(signedRequest.query || {})) {
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, v));
    } else if (value != null) {
      params.append(key, value.toString());
    }
  }
  return params.toString();
}

function scanPatterns(
  redis: Redis | Cluster,
  pattern: string,
  cursor: string = '0',
  keys: string[] = [],
) {
  return redis.scan(cursor, 'MATCH', pattern, 'COUNT', '10').then(([nextCursor, nextKeys]) => {
    keys.push(...nextKeys);
    if (nextCursor === '0') {
      return keys;
    }
    return scanPatterns(redis, pattern, nextCursor, keys);
  });
}

function safelyLogURL(log: Logger, url: string): void {
  const logURL = new URL(url);
  if (logURL.password) {
    logURL.password = '*'.repeat(logURL.password.length);
  }
  log.debug(`Connecting to Redis at ${logURL}`);
}
