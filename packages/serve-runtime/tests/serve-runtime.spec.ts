import { buildSchema, GraphQLSchema, introspectionFromSchema, printSchema } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { Response } from '@whatwg-node/server';
import { createServeRuntime } from '../src/createServeRuntime.js';
import type { MeshServePlugin } from '../src/types.js';
import { useCustomFetch } from '../src/useCustomFetch.js';

describe('Serve Runtime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  function createSupergraphRuntime() {
    return createServeRuntime({
      logging: !!process.env.DEBUG,
      supergraph: () => {
        if (!upstreamIsUp) {
          throw new Error('Upstream is down');
        }
        return getUnifiedGraphGracefully([
          {
            name: 'upstream',
            schema: createUpstreamSchema(),
            url: 'http://localhost:4000/graphql',
          },
        ]);
      },
      polling: 10000,
      plugins: () => [useCustomFetch(upstreamFetch)],
    });
  }
  function createUpstreamSchema() {
    return createSchema({
      typeDefs: /* GraphQL */ `
          """
          Fetched on ${new Date().toISOString()}
          """
          type Query {
            foo: String
          }
        `,
      resolvers: {
        Query: {
          foo: () => 'bar',
        },
      },
    });
  }
  const upstreamAPI = createYoga({
    schema: createUpstreamSchema(),
    logging: !!process.env.DEBUG,
  });
  let upstreamIsUp = true;
  const upstreamFetch = function (url: string, init: RequestInit) {
    if (url.startsWith('http://localhost:4000/graphql')) {
      if (!upstreamIsUp) {
        return Response.error();
      }
      return upstreamAPI.fetch(url, init);
    }
    return new Response('Not Found', { status: 404 });
  };
  const serveRuntimes = {
    proxyAPI: createServeRuntime({
      logging: !!process.env.DEBUG,
      proxy: {
        endpoint: 'http://localhost:4000/graphql',
      },
      plugins: () => [useCustomFetch(upstreamFetch)],
    }),
    supergraphAPI: createSupergraphRuntime(),
  };
  describe('Endpoints', () => {
    beforeEach(() => {
      upstreamIsUp = true;
    });
    Object.entries(serveRuntimes).forEach(([name, serveRuntime]) => {
      describe(name, () => {
        describe('health check', () => {
          it('succeed even if the upstream API is down', async () => {
            upstreamIsUp = false;
            const res = await serveRuntime.fetch('http://localhost:4000/healthcheck');
            expect(res.status).toBe(200);
          });
          it('succeed if the upstream API is up', async () => {
            const res = await serveRuntime.fetch('http://localhost:4000/healthcheck');
            expect(res.status).toBe(200);
          });
        });
        describe('readiness check', () => {
          it('fail if the upstream API is not ready', async () => {
            upstreamIsUp = false;
            const res = await serveRuntime.fetch('http://localhost:4000/readiness');
            expect(res.status).toBe(503);
          });
          it('succeed if the upstream API is ready', async () => {
            const res = await serveRuntime.fetch('http://localhost:4000/readiness');
            expect(res.status).toBe(200);
          });
        });
        describe('GraphiQL', () => {
          it('has GraphiQL Mesh title', async () => {
            const res = await serveRuntime.fetch('http://localhost:4000/graphql', {
              headers: {
                accept: 'text/html',
              },
            });
            const text = await res.text();
            expect(text).toContain('<title>GraphiQL Mesh</title>');
          });
        });
      });
    });
  });
  it('skips validation when disabled', async () => {
    const schema = buildSchema(
      /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      { noLocation: true },
    );
    const fetchFn = (async (_url: string, options: RequestInit) => {
      // Return a schema
      if (typeof options.body === 'string') {
        if (options.body?.includes('__schema')) {
          return Response.json({
            data: introspectionFromSchema(schema),
          });
        }
        // But respect the invalid query
        if (options.body?.includes('bar')) {
          return Response.json({ data: { bar: 'baz' } });
        }
      }
      return Response.error();
    }) as typeof fetch;
    let mockValidateFn;
    let fetchedSchema: GraphQLSchema;
    const mockPlugin: MeshServePlugin = {
      onSchemaChange({ schema }) {
        fetchedSchema = schema;
      },
      onValidate({ validateFn, setValidationFn }) {
        mockValidateFn = jest.fn(validateFn);
        setValidationFn(mockValidateFn);
      },
    };
    await using serveRuntime = createServeRuntime({
      skipValidation: true,
      proxy: {
        endpoint: 'http://localhost:4000/graphql',
      },
      plugins: () => [useCustomFetch(fetchFn), mockPlugin],
      logging: !!process.env.DEBUG,
    });
    const res = await serveRuntime.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            bar
          }
        `,
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      data: {
        bar: 'baz',
      },
    });
    expect(mockValidateFn).toHaveBeenCalledTimes(0);
    expect(printSchema(fetchedSchema)).toBe(printSchema(schema));
  });
  it('should invoke onSchemaChange hooks as soon as schema changes', done => {
    let onSchemaChangeCalls = 0;
    const serve = createServeRuntime({
      logging: !!process.env.DEBUG,
      polling: 500,
      supergraph() {
        if (onSchemaChangeCalls > 0) {
          // change schema after onSchemaChange was invoked
          return /* GraphQL */ `
            type Query {
              hello: Int!
            }
          `;
        }

        return /* GraphQL */ `
          type Query {
            world: String!
          }
        `;
      },
      plugins: () => [
        {
          onSchemaChange() {
            if (onSchemaChangeCalls === 1) {
              // schema changed for the second time
              done();
            }
            onSchemaChangeCalls++;
            serve[DisposableSymbols.asyncDispose]();
          },
        },
      ],
    });

    // trigger mesh
    serve.fetch('http://mesh/graphql?query={__typename}');
  });
});
