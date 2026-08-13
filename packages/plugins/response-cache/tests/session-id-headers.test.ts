import type { ExecutionResult } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { createGatewayRuntime, useCustomFetch } from '@graphql-hive/gateway-runtime';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import type { KeyValueCache } from '@graphql-mesh/types';
import useMeshResponseCache from '../src/index';

function createMemoryCache(): KeyValueCache {
  const map = new Map<string, unknown>();
  return {
    get(key) {
      return map.get(key) as any;
    },
    set(key, value) {
      map.set(key, value);
    },
    delete(key) {
      return map.delete(key);
    },
    getKeysByPrefix(prefix) {
      return [...map.keys()].filter(key => key.startsWith(prefix));
    },
  };
}

describe('response-cache sessionId headers', () => {
  it('uses Fetch Request headers in sessionId so different sessions do not share cache', async () => {
    const upstreamSchema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          greeting: String!
        }
      `,
      resolvers: {
        Query: {
          greeting: () => 'hello',
        },
      },
    });
    await using upstreamServer = createYoga({
      schema: upstreamSchema,
    });
    const cache = createMemoryCache();
    await using gw = createGatewayRuntime({
      supergraph: () =>
        getUnifiedGraphGracefully([
          {
            name: 'upstream',
            schema: upstreamSchema,
            url: 'http://localhost:4001/graphql',
          },
        ]),
      plugins: ctx => [
        useCustomFetch(function (url, options) {
          if (String(url) === 'http://localhost:4001/graphql') {
            return upstreamServer.fetch(url, options);
          }
          return Response.error();
        }),
        useMeshResponseCache({
          ...ctx,
          cache,
          ttl: 60_000,
          includeExtensionMetadata: true,
          sessionId: '{context.headers.test}',
        }),
      ],
    });

    async function query(testHeader: string) {
      const res = await gw.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          test: testHeader,
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              greeting
            }
          `,
        }),
      });
      expect(res.status).toBe(200);
      return (await res.json()) as ExecutionResult;
    }

    // First request for session "a" — miss, then write
    await expect(query('a')).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          didCache: true,
          hit: false,
        },
      },
    });

    // Same session — hit
    await expect(query('a')).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          hit: true,
        },
      },
    });

    // Different session "b" — must not hit "a"'s entry (reproduces #5102)
    await expect(query('b')).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          didCache: true,
          hit: false,
        },
      },
    });

    // Session "b" again — hit
    await expect(query('b')).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          hit: true,
        },
      },
    });
  });

  it('evaluates enabled `if` against Request headers', async () => {
    const upstreamSchema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          greeting: String!
        }
      `,
      resolvers: {
        Query: {
          greeting: () => 'hello',
        },
      },
    });
    await using upstreamServer = createYoga({
      schema: upstreamSchema,
    });
    const cache = createMemoryCache();
    await using gw = createGatewayRuntime({
      supergraph: () =>
        getUnifiedGraphGracefully([
          {
            name: 'upstream',
            schema: upstreamSchema,
            url: 'http://localhost:4001/graphql',
          },
        ]),
      plugins: ctx => [
        useCustomFetch(function (url, options) {
          if (String(url) === 'http://localhost:4001/graphql') {
            return upstreamServer.fetch(url, options);
          }
          return Response.error();
        }),
        useMeshResponseCache({
          ...ctx,
          cache,
          ttl: 60_000,
          includeExtensionMetadata: true,
          if: 'context.headers["x-cache"] == "1"',
        }),
      ],
    });

    async function query(cacheHeader?: string) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cacheHeader != null) {
        headers['x-cache'] = cacheHeader;
      }
      const res = await gw.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              greeting
            }
          `,
        }),
      });
      expect(res.status).toBe(200);
      return (await res.json()) as ExecutionResult;
    }

    // Caching disabled without header
    const disabled = await query();
    expect(disabled.extensions?.responseCache).toBeUndefined();

    // Caching enabled with header
    await expect(query('1')).resolves.toMatchObject({
      extensions: {
        responseCache: {
          didCache: true,
          hit: false,
        },
      },
    });
    await expect(query('1')).resolves.toMatchObject({
      extensions: {
        responseCache: {
          hit: true,
        },
      },
    });
  });
});
