import RedisCache from '@graphql-mesh/cache-redis';
import { DefaultLogger, PubSub } from '@graphql-mesh/utils';

describe('Redis', () => {
  const pubsub = new PubSub();
  const logger = new DefaultLogger('test');
  const redisCache = new RedisCache<any>({
    host: '{env.REDIS_HOST}',
    port: '{env.REDIS_PORT}',
    pubsub,
    logger,
  });
  afterAll(() => pubsub.publish('destroy', undefined));
  it('works', async () => {
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
