// inspired by https://github.com/redis/ioredis/issues/1738#issuecomment-1969925020

// eslint-disable-next-line import/no-nodejs-modules
import { createHash, createHmac } from 'node:crypto';
import { AbstractConnector } from 'ioredis';
import type { Cluster, Redis, RedisOptions, StandaloneConnectionOptions } from 'ioredis';
import type { YamlConfig } from '@graphql-mesh/types';

export type IamAuthConfig = NonNullable<YamlConfig.RedisIamAuthConfig>;

type ErrorEmitter = (type: string, err: Error) => void;
type ConnectResult = ReturnType<AbstractConnector['connect']>;

// options shape passed through ioredis to our connector
interface IamTokenConnectorOptions extends StandaloneConnectionOptions {
  tokenConnector: {
    redisRef: { current: Redis | null };
    getToken: () => Promise<string>;
  };
}

// ioredis passes the entire options object to `new Connector(options)` (Redis.js line 57),
// so we smuggle tokenConnector through RedisOptions to make it available inside IamTokenConnector
export interface IamRedisOptions extends RedisOptions {
  tokenConnector: IamTokenConnectorOptions['tokenConnector'];
}

// IamTokenConnector extends the public AbstractConnector and replicates StandaloneConnector's
// TCP/TLS connection logic so we avoid importing the non-exported deep internal path
// ioredis/built/connectors/StandaloneConnector which is not resolvable in strict ESM.
class IamTokenConnector extends AbstractConnector {
  private redisRef: { current: Redis | null };
  private getToken: () => Promise<string>;
  private options: IamTokenConnectorOptions;

  // ioredis calls Connector as `new (options: unknown)` so the parameter must be unknown here
  constructor(options: unknown) {
    const opts = options as IamTokenConnectorOptions;
    super(opts.disconnectTimeout ?? 2000);
    this.options = opts;
    this.redisRef = opts.tokenConnector.redisRef;
    this.getToken = opts.tokenConnector.getToken;
  }

  override async connect(emitter: ErrorEmitter): ConnectResult {
    const token = await this.getToken();

    const condition = this.redisRef.current?.condition;
    if (!condition) throw new Error('expected redis.condition to be set at this point');

    if (condition.auth === undefined || typeof condition.auth === 'string') {
      condition.auth = token;
    } else if (Array.isArray(condition.auth)) {
      condition.auth = [condition.auth[0], token];
    }

    return this.createStream(emitter);
  }

  // replicates StandaloneConnector.connect() TCP/TLS stream creation
  private createStream(_emitter: ErrorEmitter): ConnectResult {
    const { options } = this;
    this.connecting = true;

    return new Promise((resolve, reject) => {
      process.nextTick(async () => {
        if (!this.connecting) {
          reject(new Error('Connection is closed.'));
          return;
        }
        try {
          if (options.tls) {
            // eslint-disable-next-line import/no-nodejs-modules
            const { connect } = await import('node:tls');
            if (options.path) {
              this.stream = connect({ ...options.tls, path: options.path });
            } else {
              this.stream = connect({
                ...options.tls,
                port: options.port ?? 6380,
                host: options.host,
              });
            }
          } else {
            // eslint-disable-next-line import/no-nodejs-modules
            const { createConnection } = await import('node:net');
            if (options.path) {
              this.stream = createConnection({ path: options.path });
            } else {
              this.stream = createConnection({
                port: options.port ?? 6379,
                host: options.host,
                family: options.family,
              });
            }
          }
        } catch (err) {
          reject(err);
          return;
        }
        this.stream.once('error', err => {
          this.firstError = err;
        });
        resolve(this.stream);
      });
    });
  }
}

// generates a short-lived SigV4 presigned token for ElastiCache/MemoryDB IAM auth.
// returns the signed URL without protocol prefix - that's the auth password.
export async function generateIamToken(cfg: IamAuthConfig): Promise<string> {
  const { SignatureV4 } = await import('@smithy/signature-v4').catch(() => {
    throw new Error(
      'Missing dependency: install @smithy/signature-v4 to use Redis IAM authentication',
    );
  });

  const { fromNodeProviderChain } = await import('@aws-sdk/credential-providers').catch(() => {
    throw new Error(
      'Missing dependency: install @aws-sdk/credential-providers to use Redis IAM authentication',
    );
  });

  const service = cfg.serviceName ?? 'elasticache';
  const expirySeconds = cfg.tokenExpirySeconds ?? 900;

  // HashConstructor impl using Node crypto - satisfies @smithy/types HashConstructor contract
  const sha256 = class {
    private hash: ReturnType<typeof createHash> | ReturnType<typeof createHmac>;

    constructor(secret?: string | ArrayBuffer | ArrayBufferView) {
      if (secret != null) {
        const key = ArrayBuffer.isView(secret)
          ? Buffer.from(secret.buffer, secret.byteOffset, secret.byteLength)
          : secret instanceof ArrayBuffer
            ? Buffer.from(secret)
            : secret;
        this.hash = createHmac('sha256', key);
      } else {
        this.hash = createHash('sha256');
      }
    }

    update(data: string | ArrayBuffer | ArrayBufferView) {
      this.hash.update(
        typeof data === 'string'
          ? data
          : ArrayBuffer.isView(data)
            ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
            : Buffer.from(data),
      );
    }

    digest(): Promise<Uint8Array> {
      return Promise.resolve(new Uint8Array(this.hash.digest()));
    }
  };

  const signer = new SignatureV4({
    credentials: fromNodeProviderChain(),
    region: cfg.region,
    service,
    sha256,
  });

  const signed = await signer.presign(
    {
      method: 'GET',
      protocol: 'http:',
      hostname: cfg.clusterName,
      path: '/',
      headers: { host: cfg.clusterName },
      query: {
        Action: 'connect',
        User: cfg.userId,
      },
    },
    {
      expiresIn: expirySeconds,
      signingDate: new Date(),
    },
  );

  const qs = new URLSearchParams(signed.query as Record<string, string>).toString();
  const url = `${signed.protocol}//${signed.hostname}${signed.path}?${qs}`;

  // strip protocol - the rest is the token
  return url.replace(/^https?:\/\//, '');
}

export function buildIamRedisOptions(
  base: RedisOptions,
  cfg: IamAuthConfig,
  redisRef: { current: Redis | null },
): IamRedisOptions {
  return {
    ...base,
    tokenConnector: {
      redisRef,
      getToken: () => generateIamToken(cfg),
    },
    Connector: IamTokenConnector,
  };
}

// cluster mode: ioredis does not support per-node credential providers, so we use a different
// strategy. we install a password getter on redisOptions so every new node connection reads
// the latest token. we also refresh via setInterval at 80% of token expiry.
//
// initial token is generated in a fire-and-forget promise. with lazyConnect (the default),
// the cluster only connects on first command, so the token will be ready in time.
// commands issued before it resolves sit in the offline queue (enableOfflineQueue: true).
export function setupIamAuthForCluster(
  cluster: Cluster,
  redisOptions: RedisOptions,
  cfg: IamAuthConfig,
  username: string | undefined,
  onTimer: (timer: ReturnType<typeof setInterval>) => void,
): void {
  const expiryMs = (cfg.tokenExpirySeconds ?? 900) * 1000;
  const refreshIntervalMs = expiryMs * 0.8;
  let currentToken = '';

  // password getter - called each time ioredis sets condition.auth on a new node connection
  Object.defineProperty(redisOptions, 'password', {
    get: () => currentToken,
    set: (v: string) => {
      currentToken = v;
    },
    enumerable: true,
    configurable: true,
  });

  const refreshToken = async () => {
    currentToken = await generateIamToken(cfg);
    // also push to already-connected nodes so their next AUTH (e.g. after a server-side
    // disconnect at 12h) uses the updated token
    for (const node of cluster.nodes()) {
      if (node.condition != null) {
        node.condition.auth = username ? [username, currentToken] : currentToken;
      }
    }
  };

  // kick off initial token generation - commands queue up until this resolves
  refreshToken()
    .then(() => {
      onTimer(
        setInterval(() => {
          refreshToken().catch(() => {});
        }, refreshIntervalMs),
      );
    })
    .catch(() => {});
}
