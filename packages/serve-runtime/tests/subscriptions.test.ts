import { createClient as createSSEClient } from 'graphql-sse';
import { createSchema, createYoga, Repeater } from 'graphql-yoga';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { useCustomFetch } from '@graphql-mesh/serve-runtime';
import { type MaybePromise } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { createGatewayRuntime } from '../src/createGatewayRuntime';

describe('Subscriptions', () => {
  const leftovers: (() => MaybePromise<void>)[] = [];
  afterAll(() => Promise.all(leftovers.map(l => l())));
  const upstreamSchema = createSchema({
    typeDefs: /* GraphQL */ `
      """
      Fetched on ${new Date().toISOString()}
      """
      type Query {
        foo: String
      }

      type Subscription {
        neverEmits: String
      }
    `,
    resolvers: {
      Query: {
        foo: () => 'bar',
      },
      Subscription: {
        neverEmits: {
          subscribe: () =>
            new Repeater((_push, stop) => {
              leftovers.push(stop);
            }),
        },
      },
    },
  });
  const upstream = createYoga({ schema: upstreamSchema });

  it('should terminate subscriptions gracefully on shutdown', async () => {
    await using serve = createGatewayRuntime({
      logging: false,
      supergraph() {
        return getUnifiedGraphGracefully([
          {
            name: 'upstream',
            schema: upstreamSchema,
            url: 'http://upstream/graphql',
          },
        ]);
      },
      plugins: () => [useCustomFetch(upstream.fetch)],
    });

    const sse = createSSEClient({
      url: 'http://mesh/graphql',
      fetchFn: serve.fetch,
      on: {
        connected() {
          setImmediate(() => {
            serve[DisposableSymbols.asyncDispose]();
          });
        },
      },
    });

    const sub = sse.iterate({
      query: /* GraphQL */ `
        subscription {
          neverEmits
        }
      `,
    });

    const msgs: unknown[] = [];
    for await (const msg of sub) {
      msgs.push(msg);
    }

    expect(msgs[msgs.length - 1]).toMatchInlineSnapshot(`
{
  "errors": [
    {
      "extensions": {
        "code": "SHUTTING_DOWN",
      },
      "message": "subscription has been closed because the server is shutting down",
    },
  ],
}
`);
  });

  it('should terminate subscriptions gracefully on schema update', async () => {
    let changeSchema = false;

    await using serve = createGatewayRuntime({
      logging: !!process.env.DEBUG,
      pollingInterval: 500,
      supergraph() {
        if (changeSchema) {
          return /* GraphQL */ `
            type Query {
              hello: Int!
            }
          `;
        }
        changeSchema = true;
        return getUnifiedGraphGracefully([
          {
            name: 'upstream',
            schema: upstreamSchema,
            url: 'http://upstream/graphql',
          },
        ]);
      },
      plugins: () => [useCustomFetch(upstream.fetch)],
    });

    const sse = createSSEClient({
      url: 'http://mesh/graphql',
      fetchFn: serve.fetch,
    });

    const sub = sse.iterate({
      query: /* GraphQL */ `
        subscription {
          neverEmits
        }
      `,
    });

    const msgs: unknown[] = [];
    for await (const msg of sub) {
      msgs.push(msg);
    }

    expect(msgs[msgs.length - 1]).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "extensions": {
              "code": "SUBSCRIPTION_SCHEMA_RELOAD",
            },
            "message": "subscription has been closed due to a schema reload",
          },
        ],
      }
      `);
  });
});
