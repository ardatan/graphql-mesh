import type { ExecutionResult } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { createGatewayRuntime, useCustomFetch } from '@graphql-hive/gateway-runtime';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import type { KeyValueCache } from '@graphql-mesh/types';
import useMeshResponseCache, { matchMeshSchemaSelector } from '../src/index';

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

  it('uses Fetch Request headers in cacheKey independently of sessionId', async () => {
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
          sessionId: 'shared',
          cacheKey: '{context.headers.test}',
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

    await expect(query('a')).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          didCache: true,
          hit: false,
        },
      },
    });
    await expect(query('a')).resolves.toMatchObject({
      extensions: {
        responseCache: {
          hit: true,
        },
      },
    });
    await expect(query('b')).resolves.toMatchObject({
      extensions: {
        responseCache: {
          didCache: true,
          hit: false,
        },
      },
    });
    await expect(query('b')).resolves.toMatchObject({
      extensions: {
        responseCache: {
          hit: true,
        },
      },
    });
  });
});

describe('matchMeshSchemaSelector', () => {
  it('matches Query.* against Spec field coordinates', () => {
    expect(matchMeshSchemaSelector('Query.*', 'Query.greeting')).toBe(true);
    expect(matchMeshSchemaSelector('Query.*', 'Query.withTTL')).toBe(true);
    expect(matchMeshSchemaSelector('Query.*', 'Mutation.greeting')).toBe(false);
    expect(matchMeshSchemaSelector('Query.greeting', 'Query.greeting')).toBe(true);
    expect(matchMeshSchemaSelector('Query.greeting', 'Query.other')).toBe(false);
  });
});

describe('response-cache Schema Coordinates', () => {
  it('applies Spec Type.field TTL', async () => {
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
          includeExtensionMetadata: true,
          sessionId: 'spec-coord',
          ttlPerCoordinate: [{ coordinate: 'Query.greeting', ttl: 99_000 }],
        }),
      ],
    });

    const res = await gw.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            greeting
          }
        `,
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          didCache: true,
          hit: false,
          ttl: 99_000,
        },
      },
    });
  });

  it('applies Query.* selector TTL when the operation selects a Query field', async () => {
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
          includeExtensionMetadata: true,
          sessionId: 'selector',
          ttlPerCoordinate: [{ coordinate: 'Query.*', ttl: 12_345 }],
        }),
      ],
    });

    const res = await gw.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            greeting
          }
        `,
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          didCache: true,
          hit: false,
          ttl: 12_345,
        },
      },
    });
  });

  it('ignores other operations in the document when matching selectors', async () => {
    const upstreamSchema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          greeting: String!
          secretValue: String!
        }
      `,
      resolvers: {
        Query: {
          greeting: () => 'hello',
          secretValue: () => 'secret',
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
          includeExtensionMetadata: true,
          sessionId: 'op-name',
          // Only B matches this selector. A must still cache (default infinite TTL).
          ttlPerCoordinate: [{ coordinate: 'Query.secret*', ttl: 0 }],
        }),
      ],
    });

    const res = await gw.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'A',
        query: /* GraphQL */ `
          query A {
            greeting
          }
          query B {
            secretValue
          }
        `,
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          didCache: true,
          hit: false,
        },
      },
    });
  });

  it('keeps exact zero TTL when global is also 0 and a selector matches', async () => {
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
          includeExtensionMetadata: true,
          sessionId: 'exact-zero',
          ttl: 0,
          ttlPerCoordinate: [
            { coordinate: 'Query.greeting', ttl: 0 },
            { coordinate: 'Query.*', ttl: 12_345 },
          ],
        }),
      ],
    });

    const res = await gw.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            greeting
          }
        `,
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          didCache: false,
          hit: false,
        },
      },
    });
  });

  it('lets selector TTL override a global ttl of 0', async () => {
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
          includeExtensionMetadata: true,
          sessionId: 'global-zero',
          ttl: 0,
          ttlPerCoordinate: [{ coordinate: 'Query.*', ttl: 12_345 }],
        }),
      ],
    });

    const res = await gw.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            greeting
          }
        `,
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      data: { greeting: 'hello' },
      extensions: {
        responseCache: {
          didCache: true,
          hit: false,
          ttl: 12_345,
        },
      },
    });
  });
});
