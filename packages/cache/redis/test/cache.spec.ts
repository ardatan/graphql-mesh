/* eslint-disable no-new */
import Redis from 'ioredis';
import { dummyLogger as logger } from '../../../testing/dummyLogger';
import { buildIamRedisOptions, generateIamToken, setupIamAuthForCluster } from '../src/iam.js';
import RedisCache from '../src/index.js';

jest.mock('ioredis', () => {
  const actual = jest.requireActual<Redis>('ioredis');
  const mockInstance = () => ({ disconnect: jest.fn(), on: jest.fn(), once: jest.fn() });
  const MockRedis = jest.fn().mockImplementation(mockInstance);
  (MockRedis as any).Cluster = jest.fn().mockImplementation(mockInstance);
  return {
    __esModule: true,
    ...actual,
    default: MockRedis,
    Redis: MockRedis,
  };
});

jest.mock('@smithy/signature-v4', () => ({
  SignatureV4: jest.fn().mockImplementation(() => ({
    presign: jest.fn().mockResolvedValue({
      protocol: 'http:',
      hostname: 'my-cluster',
      path: '/',
      query: {
        Action: 'connect',
        User: 'iam-user-01',
        'X-Amz-Signature': 'abc123',
      },
    }),
  })),
}));

jest.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: jest
    .fn()
    .mockReturnValue(() =>
      Promise.resolve({ accessKeyId: 'AKIA_TEST', secretAccessKey: 'secret' }),
    ),
}));

describe('redis', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    let redisUrlEnv: string;
    let redisHostEnv: string;
    let redisPortEnv: string;
    let redisPasswordEnv: string;
    beforeAll(() => {
      redisUrlEnv = process.env.REDIS_URL;
      redisHostEnv = process.env.REDIS_HOST;
      redisPortEnv = process.env.REDIS_PORT;
      redisPasswordEnv = process.env.REDIS_PASSWORD;
      delete process.env.REDIS_URL;
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
    });
    afterAll(() => {
      process.env.REDIS_URL = redisUrlEnv;
      process.env.REDIS_HOST = redisHostEnv;
      process.env.REDIS_PORT = redisPortEnv;
      process.env.REDIS_PASSWORD = redisPasswordEnv;
    });
    it('never call Redis constructor if no config is provided', async () => {
      using redis = new RedisCache({ logger });

      expect(Redis).toHaveBeenCalledTimes(0);
    });

    it('passes configuration to redis client with default options, url case', async () => {
      using redis = new RedisCache({ url: 'redis://password@localhost:6379', logger });

      expect(Redis).toHaveBeenCalledWith(
        'redis://password@localhost:6379?lazyConnect=true&enableAutoPipelining=true&enableOfflineQueue=true',
      );
    });

    it('passes configuration to redis client with default options, url and lazyConnect (=false) case', async () => {
      using redis = new RedisCache({
        url: 'redis://password@localhost:6379',
        lazyConnect: false,
        logger,
      });

      expect(Redis).toHaveBeenCalledWith(
        'redis://password@localhost:6379?enableAutoPipelining=true&enableOfflineQueue=true',
      );
    });

    it('passes configuration to redis client with default options, url and lazyConnect (=true) case', async () => {
      using redis = new RedisCache({
        url: 'redis://password@localhost:6379',
        lazyConnect: true,
        logger,
      });

      expect(Redis).toHaveBeenCalledWith(
        'redis://password@localhost:6379?lazyConnect=true&enableAutoPipelining=true&enableOfflineQueue=true',
      );
    });

    it('passes configuration to redis client with default options, host, port & password case', async () => {
      using redis = new RedisCache({
        port: '6379',
        password: 'testpassword',
        host: 'localhost',
        logger,
      });

      expect(Redis).toHaveBeenCalledWith({
        enableAutoPipelining: true,
        enableOfflineQueue: true,
        host: 'localhost',
        lazyConnect: true,
        password: 'testpassword',
        port: 6379,
      });
    });

    it('passes configuration to redis client with default options, host, port, password & lazyConnect (=false) case', async () => {
      using redis = new RedisCache({
        port: '6379',
        password: 'testpassword',
        host: 'localhost',
        lazyConnect: false,
        logger,
      });

      expect(Redis).toHaveBeenCalledWith({
        enableAutoPipelining: true,
        enableOfflineQueue: true,
        host: 'localhost',
        password: 'testpassword',
        port: 6379,
      });
    });

    it('prefers url over specific properties if both given', () => {
      using redis = new RedisCache({
        url: 'redis://localhost:6379',
        host: 'ignoreme',
        port: '9999',
        logger,
      });

      expect(Redis).toHaveBeenCalledWith(
        'redis://localhost:6379?lazyConnect=true&enableAutoPipelining=true&enableOfflineQueue=true',
      );
    });

    it.each(['http://', 'https://', 'ftp://', null, undefined])(
      'throws an error if protocol does not match [%s]',
      protocol => {
        expect(() => {
          using redis = new RedisCache({ url: `${protocol}localhost:6379`, logger });
        }).toThrow('Redis URL must use either redis:// or rediss://');
      },
    );
  });

  describe('String interpolation', () => {
    beforeAll(() => {
      process.env.REDIS_URL = 'redis://myredis.com:9876';
      process.env.REDIS_HOST = 'myredis.com';
      process.env.REDIS_PORT = '9876';
      process.env.REDIS_PASSWORD = 'myredispassword';
    });
    afterAll(() => {
      delete process.env.REDIS_URL;
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
    });
    it('supports string interpolation for url', async () => {
      using redis = new RedisCache({
        url: '{env.REDIS_URL}',
        logger,
      });
      expect(Redis).toHaveBeenCalledWith(
        'redis://myredis.com:9876?lazyConnect=true&enableAutoPipelining=true&enableOfflineQueue=true',
      );
    });
    it('supports string interpolation for host, port and password', async () => {
      using redis = new RedisCache({
        host: '{env.REDIS_HOST}',
        port: '{env.REDIS_PORT}',
        password: '{env.REDIS_PASSWORD}',
        logger,
      });
      expect(Redis).toHaveBeenCalledWith({
        enableAutoPipelining: true,
        enableOfflineQueue: true,
        host: 'myredis.com',
        lazyConnect: true,
        password: 'myredispassword',
        port: 9876,
      });
    });
  });

  describe('IAM authentication', () => {
    it('passes Connector and tokenConnector to Redis when iamAuth is configured with host/port', async () => {
      using _redis = new RedisCache({
        host: 'my-cluster.abc123.use1.cache.amazonaws.com',
        port: '6379',
        username: 'iam-user-01',
        logger,
        iamAuth: {
          region: 'us-east-1',
          clusterName: 'my-cluster',
          userId: 'iam-user-01',
        },
      });

      expect(Redis).toHaveBeenCalledTimes(1);
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'my-cluster.abc123.use1.cache.amazonaws.com',
          port: 6379,
          username: 'iam-user-01',
          Connector: expect.any(Function),
          tokenConnector: expect.objectContaining({
            getToken: expect.any(Function),
            redisRef: expect.objectContaining({ current: expect.any(Object) }),
          }),
        }),
      );
    });

    it('passes Connector and tokenConnector to Redis when iamAuth is configured with url', async () => {
      using _redis = new RedisCache({
        url: 'rediss://iam-user-01@my-cluster.abc123.use1.cache.amazonaws.com:6379',
        logger,
        iamAuth: {
          region: 'us-east-1',
          clusterName: 'my-cluster',
          userId: 'iam-user-01',
        },
      });

      expect(Redis).toHaveBeenCalledTimes(1);
      expect(Redis).toHaveBeenCalledWith(
        expect.stringContaining('rediss://'),
        expect.objectContaining({
          Connector: expect.any(Function),
          tokenConnector: expect.objectContaining({
            getToken: expect.any(Function),
            redisRef: expect.objectContaining({ current: expect.any(Object) }),
          }),
        }),
      );
    });

    it('installs password getter on redisOptions for cluster iamAuth', async () => {
      const redisOptions = { enableAutoPipelining: true };
      const mockCluster = { nodes: () => [] } as any;
      const cfg = {
        region: 'us-east-1',
        clusterName: 'my-cluster',
        userId: 'iam-user-01',
        tokenExpirySeconds: 900,
      };

      setupIamAuthForCluster(mockCluster, redisOptions, cfg, undefined, () => {});

      const descriptor = Object.getOwnPropertyDescriptor(redisOptions, 'password');
      expect(typeof descriptor?.get).toBe('function');
      expect(typeof descriptor?.set).toBe('function');
    });

    it('IamTokenConnector.connect injects token into condition.auth (password-only)', async () => {
      const token = 'test-iam-token';
      const mockRedis = { condition: { auth: undefined, select: 0, subscriber: false } } as any;
      const redisRef = { current: mockRedis };
      const mockStream = {} as any;
      const mockEmitter = jest.fn();
      const iamCfg = { region: 'us-east-1', clusterName: 'my-cluster', userId: 'iam-user-01' };

      const opts = buildIamRedisOptions({ host: 'localhost', port: 6379 }, iamCfg, redisRef) as any;
      const connector = new opts.Connector({
        host: 'localhost',
        port: 6379,
        tokenConnector: {
          redisRef,
          getToken: () => Promise.resolve(token),
        },
      });

      // stub createStream so no real TCP connection is made
      jest.spyOn(connector as any, 'createStream').mockResolvedValue(mockStream);

      await connector.connect(mockEmitter);

      expect(mockRedis.condition.auth).toBe(token);
    });

    it('IamTokenConnector.connect injects token into condition.auth (username+password)', async () => {
      const token = 'test-iam-token';
      const mockRedis = {
        condition: { auth: ['iam-user-01', 'old-token'], select: 0, subscriber: false },
      } as any;
      const redisRef = { current: mockRedis };
      const mockStream = {} as any;
      const mockEmitter = jest.fn();
      const iamCfg = { region: 'us-east-1', clusterName: 'my-cluster', userId: 'iam-user-01' };

      const opts = buildIamRedisOptions({ host: 'localhost', port: 6379 }, iamCfg, redisRef) as any;
      const connector = new opts.Connector({
        host: 'localhost',
        port: 6379,
        tokenConnector: {
          redisRef,
          getToken: () => Promise.resolve(token),
        },
      });

      // stub createStream so no real TCP connection is made
      jest.spyOn(connector as any, 'createStream').mockResolvedValue(mockStream);

      await connector.connect(mockEmitter);

      expect(mockRedis.condition.auth).toEqual(['iam-user-01', token]);
    });

    it('generateIamToken returns token without protocol prefix containing required query params', async () => {
      const token = await generateIamToken({
        region: 'us-east-1',
        clusterName: 'my-cluster',
        userId: 'iam-user-01',
      });

      expect(token).not.toMatch(/^https?:\/\//);
      expect(token).toMatch(/^my-cluster/);
      expect(token).toContain('Action=connect');
      expect(token).toContain('User=iam-user-01');
    });
  });

  describe('methods', () => {
    it('get/set/delete', async () => {
      using redis = new RedisCache({ logger });
      const key = 'key';
      const value = 'value';
      await redis.set(key, value);
      await expect(redis.get(key)).resolves.toBe(value);
      await redis.delete(key);
      await expect(redis.get(key)).resolves.toBeUndefined();
    });
    it('getKeysByPrefix', async () => {
      using redis = new RedisCache({ logger });
      const keys = ['foo1', 'foo2', 'foo3'];
      await Promise.all(keys.map((key, i) => redis.set(key, `value${i}`)));
      await expect(redis.getKeysByPrefix('foo')).resolves.toEqual(keys);
    });
  });
});
