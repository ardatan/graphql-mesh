/* eslint-disable no-new */
import Redis from 'ioredis';
import { DefaultLogger, PubSub } from '@graphql-mesh/utils';
import RedisCache from '../src/index.js';

jest.mock('ioredis');

describe('redis', () => {
  beforeEach(() => jest.clearAllMocks());
  const pubsub = new PubSub();
  const logger = new DefaultLogger('test');

  describe('constructor', () => {
    it('never call Redis constructor if no config is provided', async () => {
      new RedisCache({ pubsub, logger });

      expect(Redis).toHaveBeenCalledTimes(0);
    });

    it('passes configuration to redis client with default options, url case', async () => {
      new RedisCache({ url: 'redis://password@localhost:6379', pubsub, logger });

      expect(Redis).toHaveBeenCalledWith(
        'redis://password@localhost:6379?lazyConnect=true&enableAutoPipelining=true&enableOfflineQueue=true',
      );
    });

    it('passes configuration to redis client with default options, host, port & password case', async () => {
      new RedisCache({ port: '6379', password: 'testpassword', host: 'localhost', pubsub, logger });

      expect(Redis).toHaveBeenCalledWith({
        enableAutoPipelining: true,
        enableOfflineQueue: true,
        host: 'localhost',
        lazyConnect: true,
        password: 'testpassword',
        port: 6379,
      });
    });

    it('prefers url over specific properties if both given', () => {
      new RedisCache({
        url: 'redis://localhost:6379',
        host: 'ignoreme',
        port: '9999',
        pubsub,
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
          new RedisCache({ url: `${protocol}localhost:6379`, pubsub, logger });
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
      new RedisCache({
        url: '{env.REDIS_URL}',
        pubsub,
        logger,
      });
      expect(Redis).toHaveBeenCalledWith(
        'redis://myredis.com:9876?lazyConnect=true&enableAutoPipelining=true&enableOfflineQueue=true',
      );
    });
    it('supports string interpolation for host, port and password', async () => {
      new RedisCache({
        host: '{env.REDIS_HOST}',
        port: '{env.REDIS_PORT}',
        password: '{env.REDIS_PASSWORD}',
        pubsub,
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
});
