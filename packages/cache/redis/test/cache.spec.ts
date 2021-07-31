import RedisCache from '../src';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('redis', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    it('passes configuration to redis client with default options, no config', async () => {
      new RedisCache();

      expect(Redis).toHaveBeenCalledWith({
        enableAutoPipelining: true,
        lazyConnect: true,
        password: undefined,
        host: undefined,
        port: undefined,
      });
    });

    it('passes configuration to redis client with default options, with url', async () => {
      new RedisCache({ url: 'redis://password@localhost:6379' });

      expect(Redis).toHaveBeenCalledWith('redis://password@localhost:6379?lazyConnect=true&enableAutoPipelining=true');
    });

    it('prefers url over specific properties if both given', () => {
      new RedisCache({ url: 'redis://localhost:6379', host: 'ignoreme', port: '9999' });

      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379?lazyConnect=true&enableAutoPipelining=true');
    });

    it.each(['http://', 'https://', 'ftp://', null, undefined])(
      'throws an error if protocol does not match [%s]',
      protocol => {
        expect(() => {
          new RedisCache({ url: `${protocol}localhost:6379` });
        }).toThrowError('Redis URL must use either redis:// or rediss://');
      }
    );
  });
});
