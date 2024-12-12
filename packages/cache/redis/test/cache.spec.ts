/* eslint-disable no-new */
import Redis from 'ioredis';
import { dummyLogger as logger } from '../../../testing/dummyLogger';
import RedisCache from '../src/index.js';

jest.mock('ioredis');

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
        }).toThrowError('Redis URL must use either redis:// or rediss://');
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
