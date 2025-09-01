import { setTimeout } from 'node:timers/promises';
import { createClient } from 'graphql-sse';
import Redis from 'ioredis';
import { createTenv } from '@e2e/tenv';
import { createDeferred } from '@graphql-tools/utils';
import { AsyncDisposableStack } from '@whatwg-node/disposablestack';
import { fetch } from '@whatwg-node/fetch';

const { container, compose, service, serve } = createTenv(__dirname);

const redisEnv = {
  REDIS_HOST: '',
  REDIS_PORT: 0,
};
beforeAll(async () => {
  const redis = await container({
    name: 'redis',
    image: 'redis:8',
    containerPort: 6379,
    healthcheck: ['CMD-SHELL', 'redis-cli ping'],
    env: {
      LANG: '', // fixes "Failed to configure LOCALE for invalid locale name."
    },
  });
  redisEnv.REDIS_HOST = '0.0.0.0';
  redisEnv.REDIS_PORT = redis.port;
});

const leftoverStack = new AsyncDisposableStack();
afterAll(async () => {
  try {
    await leftoverStack.disposeAsync();
  } catch (e) {
    console.error('Failed to dispose leftover stack', e);
  }
});

it('consumes the pubsub topics and resolves the types correctly', async () => {
  await using products = await service('products');
  await using composition = await compose({ output: 'graphql', services: [products] });
  await using gw = await serve({ supergraph: composition.output, env: redisEnv });
  const sseClient = createClient({
    retryAttempts: 0,
    url: `http://0.0.0.0:${gw.port}/graphql`,
    fetchFn: fetch,
  });
  const iterator = sseClient.iterate({
    query: /* GraphQL */ `
      subscription {
        newProduct {
          id
          name
          price
        }
      }
    `,
  });
  leftoverStack.defer(() => iterator.return?.() as any);
  const pub = new Redis({
    host: redisEnv.REDIS_HOST,
    port: redisEnv.REDIS_PORT,
  });
  leftoverStack.defer(() => pub.disconnect());
  for (let i = 0; i < 3; i++) {
    const id = i + '';
    const publishing = (async () => {
      // Publish messages after making sure the user's subscribed
      await setTimeout(500);
      await pub.publish('gw:new_product', JSON.stringify({ id }));
      await setTimeout(0); // ensure order
      await pub.publish('gw:new_product', JSON.stringify({ name: 'Roborock 80P' }));
    })();
    await expect(iterator.next()).resolves.toMatchObject({
      value: {
        data: {
          newProduct: {
            id,
            name: 'Roomba X' + id,
            price: 100,
          },
        },
      },
      done: false,
    });
    await expect(iterator.next()).resolves.toMatchObject({
      value: {
        data: {
          newProduct: {
            id: 'noid',
            name: 'Roborock 80P',
            price: 100,
          },
        },
      },
      done: false,
    });
    // Avait publishing to ensure no unhandled rejections
    await publishing;
  }
});
