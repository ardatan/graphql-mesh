import { setTimeout } from 'node:timers/promises';
import { createClient } from 'graphql-sse';
import Redis from 'ioredis';
import { createTenv } from '@e2e/tenv';
import { createDeferred } from '@graphql-tools/utils';
import { AsyncDisposableStack } from '@whatwg-node/disposablestack';

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
    url: `http://localhost:${gw.port}/graphql`,
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
  await setTimeout(300);
  // Publish 3 messages
  await pub.publish('gw:new_product', JSON.stringify({ id: '1' }));
  await expect(iterator.next()).resolves.toMatchObject({
    value: {
      data: {
        newProduct: {
          id: '1',
          name: 'Roomba X1',
          price: 100,
        },
      },
    },
    done: false,
  });
  await pub.publish('gw:new_product', JSON.stringify({ id: '2' }));
  await expect(iterator.next()).resolves.toMatchObject({
    value: {
      data: {
        newProduct: {
          id: '2',
          name: 'Roomba X2',
          price: 100,
        },
      },
    },
    done: false,
  });
  await pub.publish('gw:new_product', JSON.stringify({ id: '3' }));
  await expect(iterator.next()).resolves.toMatchObject({
    value: {
      data: {
        newProduct: {
          id: '3',
          name: 'Roomba X3',
          price: 100,
        },
      },
    },
    done: false,
  });
});
