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
import { createTenv, getAvailablePort } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';
import { TOKEN } from './services/products/server';

/** Port of Hive Gateway `e2e/federation-subscriptions-passthrough`. */
const { service, serve, composeWithApollo } = createTenv(__dirname);

const subscriptionsClientFactories = [
  ['SSE', createSSEClient],
  ['WS', createWSClient],
] as [
  string,
  (opts: Partial<SSEClientOptions> & Partial<WSClientOptions>) => SSEClient | WSClient,
][];

describe.each(subscriptionsClientFactories)('with %s', (_protocol, createClient) => {
  const headers = {
    authorization: TOKEN,
  };

  it('should subscribe and resolve via websockets', async () => {
    const { output } = await composeWithApollo({
      services: [await service('products'), await service('reviews')],
    });
    const { hostname, port } = await serve({ supergraph: output });

    const client = createClient({
      url: `http://${hostname}:${port}/graphql`,
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
            name
            price
            reviews {
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

    expect(msgs).toEqual([
      {
        data: {
          productPriceChanged: {
            name: 'Table',
            price: 1798,
            reviews: [{ score: 10 }, { score: 10 }],
          },
        },
      },
      {
        data: {
          productPriceChanged: {
            name: 'Couch',
            price: 2598,
            reviews: [{ score: 10 }],
          },
        },
      },
      {
        data: {
          productPriceChanged: {
            name: 'Chair',
            price: 108,
            reviews: [{ score: 10 }],
          },
        },
      },
    ]);
  });

  it('should recycle websocket connections', async () => {
    const { output } = await composeWithApollo({
      services: [await service('products'), await service('reviews')],
    });
    const { hostname, port } = await serve({ supergraph: output });

    const client = createClient({
      url: `http://${hostname}:${port}/graphql`,
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
      for await (const msg of client.iterate({ query })) {
        expect(msg).toMatchObject({
          data: expect.any(Object),
        });
        break;
      }
      await setTimeout(300);
    }
  });

  it('should subscribe and resolve via http callbacks', async () => {
    const availablePort = await getAvailablePort();
    const publicUrl = `http://0.0.0.0:${availablePort}`;
    const { output } = await composeWithApollo({
      services: [await service('products'), await service('reviews')],
    });
    await serve({
      supergraph: output,
      port: availablePort,
      env: {
        PUBLIC_URL: publicUrl + '/callback',
      },
    });

    const client = createClient({
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
      { data: { countdown: 4 } },
      { data: { countdown: 3 } },
      { data: { countdown: 2 } },
      { data: { countdown: 1 } },
    ]);
  });
});
