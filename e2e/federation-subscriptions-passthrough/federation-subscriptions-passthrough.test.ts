import { setTimeout } from 'timers/promises';
import { createClient } from 'graphql-sse';
import {
  IntrospectAndCompose,
  RemoteGraphQLDataSource,
  type ServiceEndpointDefinition,
} from '@apollo/gateway';
import { createTenv } from '@e2e/tenv';
import { TOKEN } from './services/products/server';

const { fs, service, serve } = createTenv(__dirname);

async function startServicesAndCreateSupergraphFile() {
  const services = [await service('products'), await service('reviews', { pipeLogs: true })];

  const subgraphs: ServiceEndpointDefinition[] = [];
  for (const service of services) {
    subgraphs.push({
      name: service.name,
      url: `http://0.0.0.0:${service.port}/graphql`,
    });
  }

  const { supergraphSdl } = await new IntrospectAndCompose({
    subgraphs,
  }).initialize({
    getDataSource(opts) {
      return new RemoteGraphQLDataSource(opts);
    },
    update() {},
    async healthCheck() {},
  });

  const supergraphFile = await fs.tempfile('supergraph.graphql');
  await fs.write(supergraphFile, supergraphSdl);
  return supergraphFile;
}

it('should subscribe and resolve via websockets', async () => {
  const supergraphFile = await startServicesAndCreateSupergraphFile();
  const { port } = await serve({ supergraph: supergraphFile });

  const client = createClient({
    url: `http://0.0.0.0:${port}/graphql`,
    retryAttempts: 0,
    headers: {
      Authorization: TOKEN,
    },
  });
  const sub = client.iterate({
    query: /* GraphQL */ `
      subscription OnProductPriceChanged {
        productPriceChanged {
          # Defined in Products subgraph
          name
          price
          reviews {
            # Defined in Reviews subgraph
            score
          }
        }
      }
    `,
  });

  const msgs = [];
  for await (const msg of sub) {
    msgs.push(msg);
    if (msgs.length >= 3) {
      break;
    }
  }

  expect(msgs).toMatchInlineSnapshot(`
[
  {
    "data": {
      "productPriceChanged": {
        "name": "Table",
        "price": 1798,
        "reviews": [
          {
            "score": 10,
          },
          {
            "score": 10,
          },
        ],
      },
    },
  },
  {
    "data": {
      "productPriceChanged": {
        "name": "Couch",
        "price": 2598,
        "reviews": [
          {
            "score": 10,
          },
        ],
      },
    },
  },
  {
    "data": {
      "productPriceChanged": {
        "name": "Chair",
        "price": 108,
        "reviews": [
          {
            "score": 10,
          },
        ],
      },
    },
  },
]
`);
});

it('should recycle websocket connections', async () => {
  const supergraphFile = await startServicesAndCreateSupergraphFile();
  const { port } = await serve({ supergraph: supergraphFile });

  const client = createClient({
    url: `http://0.0.0.0:${port}/graphql`,
    retryAttempts: 0,
    headers: {
      Authorization: TOKEN,
    },
  });

  const query = /* GraphQL */ `
    subscription OnProductPriceChanged {
      productPriceChanged {
        price
      }
    }
  `;
  for (let i = 0; i < 5; i++) {
    // connect
    for await (const msg of client.iterate({ query })) {
      expect(msg).toMatchObject({
        data: expect.any(Object),
      });
      break; // complete subscription on first received message
    }
    // disconnect

    await setTimeout(300); // wait a bit and subscribe again (lazyCloseTimeout is 3 seconds)
  }

  // the "products" service will crash if multiple websockets were connected breaking the loop above with an error
});

it('should subscribe and resolve via http callbacks', async () => {
  const supergraphFile = await startServicesAndCreateSupergraphFile();
  await serve({ supergraph: supergraphFile, port: 4000, pipeLogs: true });

  const client = createClient({
    url: `http://0.0.0.0:4000/graphql`,
    retryAttempts: 0,
  });
  const sub = client.iterate({
    query: /* GraphQL */ `
      subscription CountDown {
        countdown(from: 4)
      }
    `,
  });

  const msgs = [];
  for await (const msg of sub) {
    expect(msg).toMatchObject({
      data: expect.any(Object),
    });
    msgs.push(msg);
    if (msgs.length >= 4) {
      break;
    }
  }

  expect(msgs).toMatchObject([
    {
      data: {
        countdown: 4,
      },
    },
    {
      data: {
        countdown: 3,
      },
    },
    {
      data: {
        countdown: 2,
      },
    },
    {
      data: {
        countdown: 1,
      },
    },
  ]);
});
