/* eslint-disable no-new */
import RedisCache from '../src';
import Redis from 'ioredis';
import { PubSub } from '@graphql-mesh/utils';

jest.mock('ioredis');

describe('redis', () => {
  beforeEach(() => jest.clearAllMocks());
  const pubsub = new PubSub();

  describe('constructor', () => {
    it('never call Redis constructor if no config is provided', async () => {
      new RedisCache({ pubsub });

      expect(Redis).toHaveBeenCalledTimes(0);
    });

    it('passes configuration to redis client with default options, url case', async () => {
      new RedisCache({ url: 'redis://password@localhost:6379', pubsub });

      expect(Redis).toHaveBeenCalledWith(
        'redis://password@localhost:6379?lazyConnect=true&enableAutoPipelining=true&enableOfflineQueue=true'
      );
    });

    it('passes configuration to redis client with default options, host, port & password case', async () => {
      new RedisCache({ port: '6379', password: 'testpassword', host: 'localhost', pubsub });

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
      new RedisCache({ url: 'redis://localhost:6379', host: 'ignoreme', port: '9999', pubsub });

      expect(Redis).toHaveBeenCalledWith(
        'redis://localhost:6379?lazyConnect=true&enableAutoPipelining=true&enableOfflineQueue=true'
      );
    });

    it.each(['http://', 'https://', 'ftp://', null, undefined])(
      'throws an error if protocol does not match [%s]',
      protocol => {
        expect(() => {
          new RedisCache({ url: `${protocol}localhost:6379`, pubsub });
        }).toThrowError('Redis URL must use either redis:// or rediss://');
      }
    );
  });
});
