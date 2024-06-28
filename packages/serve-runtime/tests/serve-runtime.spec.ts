/* eslint-disable import/no-extraneous-dependencies */
import { buildSchema, GraphQLSchema, introspectionFromSchema, printSchema } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { composeSubgraphs, getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { Response } from '@whatwg-node/server';
import { createServeRuntime } from '../src/createServeRuntime.js';
import { MeshServePlugin } from '../src/types.js';

describe('Serve Runtime', () => {
  describe('Health and Readiness checks', () => {
    const upstreamSchema = createSchema({
      typeDefs: `
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
    const upstreamAPI = createYoga({
      schema: upstreamSchema,
      logging: false,
    });
    let upstreamIsUp = true;
    const serveRuntimes = {
      proxyAPI: createServeRuntime({
        logging: false,
        proxy: {
          endpoint: 'http://localhost:4000/graphql',
          fetch(info, init, ...args) {
            if (!upstreamIsUp) {
              return Response.error();
            }
            return upstreamAPI.fetch(info, init, ...args);
          },
        },
      }),
      supergraphAPI: createServeRuntime({
        logging: false,
        supergraph: () => {
          if (!upstreamIsUp) {
            throw new Error('Upstream is down');
          }
          return getUnifiedGraphGracefully([
            {
              name: 'upstream',
              schema: upstreamSchema,
            },
          ]);
        },
        transports() {
          return {
            getSubgraphExecutor() {
              return buildHTTPExecutor({
                endpoint: 'http://localhost:4000/graphql',
                fetch(info, init, ...args) {
                  if (!upstreamIsUp) {
                    return Response.error();
                  }
                  return upstreamAPI.fetch(info, init, ...args);
                },
              });
            },
          };
        },
      }),
    };
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
          it('fail if the proxy API is not ready', async () => {
            upstreamIsUp = false;
            const res = await serveRuntime.fetch('http://localhost:4000/readiness');
            expect(res.status).toBe(503);
          });
          it('succeed if the proxy API is ready', async () => {
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
    const serveRuntime = createServeRuntime({
      skipValidation: true,
      proxy: {
        endpoint: 'http://localhost:4000/graphql',
      },
      fetchAPI: {
        fetch: fetchFn,
      },
      plugins: () => [mockPlugin],
      logging: false,
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
});
