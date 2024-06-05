import RedisCache from '@graphql-mesh/cache-redis';
import { DefaultLogger } from '@graphql-mesh/utils';

describe('Redis', () => {
  const logger = new DefaultLogger('test');
  it('works', async () => {
    using redisCache = new RedisCache<any>({
      host: '{env.REDIS_HOST}',
      port: '{env.REDIS_PORT}',
      logger,
    });
    const test = await redisCache.get('test');
    expect(test).toBeUndefined();
    const now = Date.now();
    await redisCache.set('now', now);
    const test2 = await redisCache.get('now');
    expect(test2).toBe(now);
    await redisCache.delete('now');
    const test3 = await redisCache.get('now');
    expect(test3).toBeUndefined();
  });
});
