import { setTimeout } from 'timers/promises';
import {
  createClient as createSSEClient,
  type Client as SSEClient,
  type ClientOptions as SSEClientOptions,
} from 'graphql-sse';
import {
  createClient as createWSClient,
  type Client as WSClient,
  type ClientOptions as WSClientOptions,
} from 'graphql-ws';
import webSocketImpl from 'ws';
import { getLocalHostName } from '@e2e/opts';
import { createTenv, getAvailablePort } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';
import { TOKEN } from './services/products/server';

const { composeWithApollo, service, serve } = createTenv(__dirname);

let client: WSClient | SSEClient | null = null;

afterEach(() => client?.dispose());

const subscriptionsClientFactories = [
  ['SSE', createSSEClient],
  ['WS', createWSClient],
] as [
  string,
  (opts: Partial<SSEClientOptions> & Partial<WSClientOptions>) => SSEClient | WSClient,
][];

subscriptionsClientFactories.forEach(([protocol, createClient]) => {
  if (protocol === 'WS' && process.version.startsWith('v18')) {
    return;
  }
  describe(`with ${protocol}`, () => {
    const headers = {
      authorization: TOKEN,
    };
    it('should subscribe and resolve via websockets', async () => {
      const supergraphFile = await composeWithApollo([
        await service('products'),
        await service('reviews'),
      ]);
      const { port } = await serve({ supergraph: supergraphFile });

      client = createClient({
        url: `http://localhost:${port}/graphql`,
        retryAttempts: 0,
        headers,
        connectionParams: headers,
        fetchFn: fetch,
        webSocketImpl,
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
      const supergraphFile = await composeWithApollo([
        await service('products'),
        await service('reviews'),
      ]);
      const { port } = await serve({ supergraph: supergraphFile });

      client = createClient({
        url: `http://localhost:${port}/graphql`,
        retryAttempts: 0,
        headers,
        connectionParams: headers,
        fetchFn: fetch,
        webSocketImpl,
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
      const supergraphFile = await composeWithApollo([
        await service('products'),
        await service('reviews'),
      ]);

      // Get a random available port
      const availablePort = await getAvailablePort();

      const publicUrl = `http://${getLocalHostName()}:${availablePort}`;
      await serve({
        supergraph: supergraphFile,
        port: availablePort,
        env: {
          PUBLIC_URL: publicUrl,
        },
      });
      client = createClient({
        url: `${publicUrl}/graphql`,
        retryAttempts: 0,
        fetchFn: fetch,
        webSocketImpl,
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
  });
});
