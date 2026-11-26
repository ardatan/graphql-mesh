import { setTimeout } from 'node:timers/promises';
import { createClient } from 'graphql-sse';
import { createTenv } from '@e2e/tenv';
import { connect as natsConnect } from '@nats-io/transport-node';
import { fetch } from '@whatwg-node/fetch';

const { container, serve, service, composeWithApollo } = createTenv(__dirname);

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

async function serveGateway(products: Awaited<ReturnType<typeof service>>) {
  const { output } = await composeWithApollo({ services: [products] });
  return serve({ supergraph: output, env: natsEnv });
}

it('should receive subscription published event on all distributed gateways', async () => {
  const products = await service('products');
  const gws = await Promise.all(Array.from({ length: 3 }, () => serveGateway(products)));

  const clients = gws.map(gw =>
    createClient({
      url: `http://0.0.0.0:${gw.port}/graphql`,
      fetchFn: fetch,
      retryAttempts: 0,
    }),
  );

  const subs = clients.map(client =>
    client.iterate({
      query: /* GraphQL */ `
        subscription {
          newProduct {
            name
            price
          }
        }
      `,
    }),
  );

  const msgs: any[] = [];

  await Promise.all([
    (async () => {
      await setTimeout(1_000);
      const nats = await natsConnect({
        servers: [`0.0.0.0:${natsEnv.NATS_PORT}`],
      });
      await using _ = {
        async [Symbol.asyncDispose]() {
          await nats.flush();
          await nats.close();
        },
      };
      nats.publish(
        'my-shared-gateways:new_product',
        JSON.stringify({
          id: '60',
        }),
      );
    })(),
    ...subs.map(sub =>
      (async () => {
        for await (const msg of sub) {
          msgs.push(msg);
          break;
        }
      })(),
    ),
  ]);

  expect(msgs).toHaveLength(3);
  for (const msg of msgs) {
    expect(msg).toMatchObject({
      data: {
        newProduct: {
          name: 'Roomba X60',
          price: 100,
        },
      },
    });
  }
});

it('should send a payload from a mutation to another gateway using NATS', async () => {
  const products = await service('products');
  const consumer = await serveGateway(products);
  const producer = await serveGateway(products);

  const client = createClient({
    url: `http://0.0.0.0:${consumer.port}/graphql`,
    fetchFn: fetch,
    retryAttempts: 0,
  });

  let msg: any = null;
  await Promise.all([
    (async () => {
      const sub = client.iterate({
        query: /* GraphQL */ `
          subscription {
            newProduct {
              name
              price
            }
          }
        `,
      });
      for await (const _msg of sub) {
        msg = _msg;
        break;
      }
    })(),
    (async () => {
      await setTimeout(300);
      await producer.execute({
        query: /* GraphQL */ `
          mutation {
            createProduct(name: "Roomba X60", price: 100) {
              id
              name
              price
            }
          }
        `,
      });
    })(),
  ]);

  expect(msg).toMatchObject({
    data: {
      newProduct: {
        name: 'Roomba X60',
        price: 100,
      },
    },
  });
});
