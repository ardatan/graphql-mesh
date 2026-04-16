import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@smithy/signature-v4';
import { dummyLogger as logger } from '../../../testing/dummyLogger';
import RedisCache from '../src/index.js';

// `var` is used here intentionally: jest.mock factories are hoisted to the top of the
// file by babel-jest, before `let`/`const` declarations are initialised. `var` avoids
// the temporal dead zone, so MockRedis/MockCluster can be safely assigned inside the
// factory and then read by the tests.
// eslint-disable-next-line no-var
var MockRedis: jest.Mock;
// eslint-disable-next-line no-var
var MockCluster: jest.Mock;

jest.mock('ioredis', () => {
  const makeMockInstance = () => ({ disconnect: jest.fn() });
  MockCluster = jest.fn(() => makeMockInstance());
  MockRedis = jest.fn(() => makeMockInstance());
  (MockRedis as any).Cluster = MockCluster;
  return { __esModule: true, default: MockRedis };
});
jest.mock('@aws-sdk/credential-provider-node', () => ({
  defaultProvider: jest.fn(() => jest.fn(async () => ({ accessKeyId: 'akid', secretAccessKey: 'secret' }))),
}));
jest.mock('@smithy/signature-v4', () => ({
  SignatureV4: jest.fn().mockImplementation(() => ({
    presign: jest.fn(async () => ({
      query: {
        Action: 'connect',
        User: 'cache-user',
        'X-Amz-Signature': 'mock-signature',
      },
    })),
  })),
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

      expect(MockRedis).toHaveBeenCalledTimes(0);
    });

    it('passes configuration to redis client with default options, url case', async () => {
      using redis = new RedisCache({ url: 'redis://password@localhost:6379', logger });

      expect(MockRedis).toHaveBeenCalledWith(
        'redis://password@localhost:6379?lazyConnect=true&enableAutoPipelining=true&enableOfflineQueue=true',
      );
    });

    it('passes configuration to redis client with default options, url and lazyConnect (=false) case', async () => {
      using redis = new RedisCache({
        url: 'redis://password@localhost:6379',
        lazyConnect: false,
        logger,
      });

      expect(MockRedis).toHaveBeenCalledWith(
        'redis://password@localhost:6379?enableAutoPipelining=true&enableOfflineQueue=true',
      );
    });

    it('passes configuration to redis client with default options, url and lazyConnect (=true) case', async () => {
      using redis = new RedisCache({
        url: 'redis://password@localhost:6379',
        lazyConnect: true,
        logger,
      });

      expect(MockRedis).toHaveBeenCalledWith(
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

      expect(MockRedis).toHaveBeenCalledWith({
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

      expect(MockRedis).toHaveBeenCalledWith({
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

      expect(MockRedis).toHaveBeenCalledWith(
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

    it('passes IAM-generated credentials for host-based configuration', async () => {
      using redis = new RedisCache({
        host: 'cache.example.amazonaws.com',
        port: '6379',
        iam: {
          region: 'us-east-1',
          username: 'cache-user',
        },
        logger,
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
          service: 'elasticache',
        }),
      );
      expect(MockRedis).toHaveBeenCalledWith({
        enableAutoPipelining: true,
        enableOfflineQueue: true,
        host: 'cache.example.amazonaws.com',
        lazyConnect: true,
        password: 'Action=connect&User=cache-user&X-Amz-Signature=mock-signature',
        port: 6379,
        tls: {},
        username: 'cache-user',
      });
      expect(defaultProvider).toHaveBeenCalledTimes(1);
    });

    it('throws if iam is configured with redis:// URL', async () => {
      using redis = new RedisCache({
        url: 'redis://cache.example.amazonaws.com:6379',
        iam: {
          region: 'us-east-1',
          username: 'cache-user',
        },
        logger,
      });
      await expect(redis.get('test')).rejects.toThrow(
        'Redis IAM authentication requires rediss:// URLs.',
      );
    });

    it('throws if iam is configured with Sentinel mode', () => {
      expect(() => {
        // `using` can't be used here as the constructor throws; lint rule no-new is
        // satisfied because we need the constructor side-effect (the throw).
        // eslint-disable-next-line no-new
        new RedisCache({
          name: 'mymaster',
          sentinels: [{ host: 'sentinel.example.com', port: '26379' }],
          sentinelPassword: 'sentpass',
          iam: {
            region: 'us-east-1',
            username: 'cache-user',
          },
          logger,
        } as any);
      }).toThrow('Redis IAM authentication is not supported with Sentinel mode.');
    });

    it('passes IAM-generated credentials for cluster (startupNodes) configuration', async () => {
      using redis = new RedisCache({
        startupNodes: [{ host: 'cluster.example.amazonaws.com', port: '6379' }],
        iam: {
          region: 'us-east-1',
          username: 'cache-user',
        },
        logger,
      } as any);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(SignatureV4).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
          service: 'elasticache',
        }),
      );
      expect(MockCluster).toHaveBeenCalledWith(
        [{ host: 'cluster.example.amazonaws.com', port: 6379, family: undefined }],
        expect.objectContaining({
          redisOptions: expect.objectContaining({
            username: 'cache-user',
            password: 'Action=connect&User=cache-user&X-Amz-Signature=mock-signature',
            tls: {},
          }),
        }),
      );
    });
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
      expect(MockRedis).toHaveBeenCalledWith(
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
      expect(MockRedis).toHaveBeenCalledWith({
        enableAutoPipelining: true,
        enableOfflineQueue: true,
        host: 'myredis.com',
        lazyConnect: true,
        password: 'myredispassword',
        port: 9876,
      });
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
