import { setTimeout } from 'node:timers/promises';
import { createClient } from 'graphql-sse';
import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

const { container, serve, service, compose } = createTenv(__dirname);

const natsEnv = {
  NATS_HOST: '',
  NATS_PORT: 0,
};
beforeAll(async () => {
  const nats = await container({
    name: 'nats',
    image: 'nats:2.11-alpine', // we want alpine for healtcheck
    containerPort: 4222,
    healthcheck: ['CMD-SHELL', 'wget --spider http://localhost:8222/healthz'],
  });
  natsEnv.NATS_HOST = '0.0.0.0';
  natsEnv.NATS_PORT = nats.port;
});

it('should perform entity resolution', async () => {
  const products = await service('products', {
    // services always run on the host, never in docker
    env: { ...natsEnv, NATS_HOST: '0.0.0.0' },
  });
  const reviews = await service('reviews');
  const { output } = await compose({
    output: 'graphql',
    services: [products, reviews],
  });
  const gw = await serve({ supergraph: output, env: natsEnv });

  const client = createClient({
    url: `http://0.0.0.0:${gw.port}/graphql`,
    fetchFn: fetch,
    retryAttempts: 0,
  });

  const sub = client.iterate({
    query: /* GraphQL */ `
      subscription OnNewProduct {
        newProduct {
          id
          name
          price
          review {
            id
            content
          }
        }
      }
    `,
  });

  // wait a moment for the subscription to bite
  await setTimeout(50);

  await expect(
    gw.execute({
      query: /* GraphQL */ `
        mutation AddProduct {
          addProduct(id: "10", name: "Desk", price: 199.99) {
            id
          }
        }
      `,
    }),
  ).resolves.toEqual({
    data: {
      addProduct: {
        id: '10',
      },
    },
  });

  for await (const msg of sub) {
    expect(msg).toEqual({
      data: {
        newProduct: {
          id: '10',
          name: 'Desk',
          price: 199.99,
          review: {
            id: '10',
            content: `Resolved review for the product with the id of 10`,
          },
        },
      },
    });
    break;
  }
});
