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

    it('passes configuration to redis client with default options, url case', async () => {
      new RedisCache({ url: 'redis://password@localhost:6379' });

      expect(Redis).toHaveBeenCalledWith('redis://password@localhost:6379?lazyConnect=true&enableAutoPipelining=true');
    });

    it('passes configuration to redis client with default options, host, port & password case', async () => {
      new RedisCache({ port: '6379', password: 'testpassword', host: 'localhost' });

      expect(Redis).toHaveBeenCalledWith({
        enableAutoPipelining: true,
        host: 'localhost',
        lazyConnect: true,
        password: 'testpassword',
        port: '6379',
      });
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
