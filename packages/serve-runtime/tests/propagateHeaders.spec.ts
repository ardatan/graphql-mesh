import { createSchema, createYoga, type Plugin } from 'graphql-yoga';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { useCustomFetch } from '@graphql-mesh/serve-runtime';
import { createGatewayRuntime } from '../src/createGatewayRuntime';

describe('usePropagateHeaders', () => {
  describe('From Client to the Subgraphs', () => {
    const requestTrackerPlugin = {
      onParams: jest.fn((() => {}) as Plugin['onParams']),
    };
    const upstream = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        resolvers: {
          Query: {
            hello: () => 'world',
          },
        },
      }),
      plugins: [requestTrackerPlugin],
      logging: !!process.env.DEBUG,
    });
    beforeEach(() => {
      requestTrackerPlugin.onParams.mockClear();
    });
    it('forwards specified headers', async () => {
      await using serveRuntime = createGatewayRuntime({
        proxy: {
          endpoint: 'http://localhost:4001/graphql',
        },
        propagateHeaders: {
          fromClientToSubgraphs({ request }) {
            return {
              'x-my-header': request.headers.get('x-my-header'),
              'x-my-other': request.headers.get('x-my-other'),
            };
          },
        },
        plugins: () => [useCustomFetch(upstream.fetch)],
        logging: !!process.env.DEBUG,
      });
      const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'x-my-header': 'my-value',
          'x-my-other': 'other-value',
          'x-extra-header': 'extra-value',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              hello
            }
          `,
          extensions: {
            randomThing: 'randomValue',
          },
        }),
      });

      const resJson = await response.json();
      expect(resJson).toEqual({
        data: {
          hello: 'world',
        },
      });

      // The first call is for the introspection
      expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(2);
      const onParamsPayload = requestTrackerPlugin.onParams.mock.calls[1][0];
      // Do not pass extensions
      expect(onParamsPayload.params.extensions).toBeUndefined();
      const headersObj = Object.fromEntries(onParamsPayload.request.headers.entries());
      expect(headersObj['x-my-header']).toBe('my-value');
      expect(headersObj['x-my-other']).toBe('other-value');
      expect(headersObj['x-extra-header']).toBeUndefined();
    });
    it("forwards specified headers but doesn't override the provided headers", async () => {
      await using serveRuntime = createGatewayRuntime({
        logging: !!process.env.DEBUG,
        proxy: {
          endpoint: 'http://localhost:4001/graphql',
          headers: {
            'x-my-header': 'my-value',
            'x-extra-header': 'extra-value',
          },
        },
        propagateHeaders: {
          fromClientToSubgraphs({ request }) {
            return {
              'x-my-header': request.headers.get('x-my-header')!,
              'x-my-other': request.headers.get('x-my-other')!,
            };
          },
        },
        plugins: () => [useCustomFetch(upstream.fetch)],
        maskedErrors: false,
      });
      const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-my-header': 'my-new-value',
          'x-my-other': 'other-value',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              hello
            }
          `,
        }),
      });

      const resJson = await response.json();
      expect(resJson).toEqual({
        data: {
          hello: 'world',
        },
      });

      // The first call is for the introspection
      expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(2);
      const onParamsPayload = requestTrackerPlugin.onParams.mock.calls[1][0];
      // Do not pass extensions
      expect(onParamsPayload.params.extensions).toBeUndefined();
      const headersObj = Object.fromEntries(onParamsPayload.request.headers.entries());
      expect(headersObj['x-my-header']).toBe('my-value');
      expect(headersObj['x-extra-header']).toBe('extra-value');
      expect(headersObj['x-my-other']).toBe('other-value');
    });
  });
  describe('From Subgraphs to the Client', () => {
    const upstream1 = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello1: String
        }
      `,
      resolvers: {
        Query: {
          hello1: () => 'world1',
        },
      },
    });
    const upstream1Fetch = createYoga({
      schema: upstream1,
      plugins: [
        {
          onResponse: ({ response }) => {
            response.headers.set('upstream1', 'upstream1');
            response.headers.append('set-cookie', 'cookie1=value1');
            response.headers.append('set-cookie', 'cookie2=value2');
          },
        },
      ],
    }).fetch;
    const upstream2 = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello2: String
        }
      `,
      resolvers: {
        Query: {
          hello2: () => 'world2',
        },
      },
    });
    const upstream2Fetch = createYoga({
      schema: upstream2,
      plugins: [
        {
          onResponse: ({ response }) => {
            response.headers.set('upstream2', 'upstream2');
            response.headers.append('set-cookie', 'cookie3=value3');
            response.headers.append('set-cookie', 'cookie4=value4');
          },
        },
      ],
    }).fetch;
    it('Aggregates cookies from all subgraphs', async () => {
      await using serveRuntime = createGatewayRuntime({
        supergraph: () => {
          return getUnifiedGraphGracefully([
            {
              name: 'upstream1',
              schema: upstream1,
              url: 'http://localhost:4001/graphql',
            },
            {
              name: 'upstream2',
              schema: upstream2,
              url: 'http://localhost:4002/graphql',
            },
          ]);
        },
        propagateHeaders: {
          fromSubgraphsToClient({ response }) {
            const cookies = response.headers.getSetCookie();
            return {
              upstream1: response.headers.get('upstream1'),
              upstream2: response.headers.get('upstream2'),
              'set-cookie': cookies,
            };
          },
        },
        plugins: () => [
          useCustomFetch((url, options, context, info) => {
            switch (url) {
              case 'http://localhost:4001/graphql':
                return upstream1Fetch(url, options, context, info);
              case 'http://localhost:4002/graphql':
                return upstream2Fetch(url, options, context, info);
              default:
                throw new Error('Invalid URL');
            }
          }),
        ],
        logging: !!process.env.DEBUG,
      });
      const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              hello1
              hello2
            }
          `,
        }),
      });

      const resJson = await response.json();
      expect(resJson).toEqual({
        data: {
          hello1: 'world1',
          hello2: 'world2',
        },
      });

      expect(response.headers.get('upstream1')).toBe('upstream1');
      expect(response.headers.get('upstream2')).toBe('upstream2');
      expect(response.headers.get('set-cookie')).toBe(
        'cookie1=value1, cookie2=value2, cookie3=value3, cookie4=value4',
      );
    });
  });
});
