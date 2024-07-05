/* eslint-disable import/no-extraneous-dependencies */
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import AsyncDisposableStack from 'disposablestack/AsyncDisposableStack';
import {
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  introspectionFromSchema,
  printSchema,
  type ExecutionResult,
  type IntrospectionQuery,
} from 'graphql';
import { createClient as createSSEClient } from 'graphql-sse';
import { createSchema, createYoga, Repeater } from 'graphql-yoga';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import type { MeshServePlugin } from '@graphql-mesh/serve-runtime';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import type { MaybePromise } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/server';
import { createServeRuntime } from '../src/createServeRuntime.js';

const leftovers: (() => MaybePromise<void>)[] = [];
afterAll(() => Promise.all(leftovers.map(l => l())));

describe('Serve Runtime', () => {
  jest.useFakeTimers();
  function createSupergraphRuntime() {
    return createServeRuntime({
      logging: false,
      supergraph: () => {
        if (!upstreamIsUp) {
          throw new Error('Upstream is down');
        }
        return getUnifiedGraphGracefully([
          {
            name: 'upstream',
            schema: createUpstreamSchema(),
          },
        ]);
      },
      polling: 10000,
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

          type Subscription {
            pull: String
            neverEmits: String
          }
        `,
      resolvers: {
        Query: {
          foo: () => 'bar',
        },
        Subscription: {
          pull: {
            subscribe: () =>
              new Repeater(push => {
                push({ pull: 'push' });
              }),
          },
          neverEmits: {
            subscribe: () =>
              new Repeater(() => {
                return new Promise<void>(resolve => {
                  leftovers.push(() => resolve());
                });
              }),
          },
        },
      },
    });
  }
  const upstreamAPI = createYoga({
    schema: createUpstreamSchema(),
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
  describe('Hive CDN', () => {
    afterEach(() => {
      delete process.env.HIVE_CDN_ENDPOINT;
      delete process.env.HIVE_CDN_KEY;
    });
    it('respects env vars', async () => {
      await using disposableStack = new AsyncDisposableStack();
      const cdnServer = createServer((req, res) => {
        const supergraph = getUnifiedGraphGracefully([
          {
            name: 'upstream',
            schema: createUpstreamSchema(),
          },
        ]);
        res.end(supergraph);
      });
      await new Promise<void>(resolve => {
        cdnServer.listen(0, resolve);
      });
      disposableStack.defer(
        () =>
          new Promise<void>((resolve, reject) => {
            cdnServer.close(err => (err ? reject(err) : resolve()));
          }),
      );
      process.env.HIVE_CDN_ENDPOINT = `http://localhost:${(cdnServer.address() as AddressInfo).port}`;
      process.env.HIVE_CDN_KEY = 'key';
      const serveRuntime = createServeRuntime();
      disposableStack.use(serveRuntime);
      const res = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: getIntrospectionQuery({
            descriptions: false,
          }),
        }),
      });

      expect(res.status).toBe(200);
      const resJson: ExecutionResult<IntrospectionQuery> = await res.json();
      const clientSchema = buildClientSchema(resJson.data);
      expect(printSchema(clientSchema)).toMatchSnapshot('hive-cdn');
    });
  });
  describe('Defaults', () => {
    it('falls back to "./supergraph.graphql" by default', async () => {
      const serveRuntime = createServeRuntime({
        cwd: __dirname,
      });
      const res = await serveRuntime.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: getIntrospectionQuery(),
        }),
      });

      expect(res.status).toBe(200);
      const resJson: ExecutionResult<IntrospectionQuery> = await res.json();
      const clientSchema = buildClientSchema(resJson.data);
      expect(printSchema(clientSchema)).toMatchSnapshot('default-supergraph');
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
  it('terminates subscriptions gracefully on shutdown', async () => {
    const runtime = createSupergraphRuntime();

    const sse = createSSEClient({
      url: 'http://mesh/graphql',
      fetchFn: runtime.fetch,
      on: {
        connected() {
          runtime[Symbol.asyncDispose]();
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
  it('terminates subscriptions gracefully on schema update', async () => {
    upstreamIsUp = true;
    const res = await serveRuntimes.supergraphAPI.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          subscription {
            pull
          }
        `,
      }),
    });

    let firstValPushed = false;
    let terminated = false;
    for await (const chunk of res.body) {
      const chunkStr = chunk.toString();
      if (terminated) {
        expect(chunkStr).toContain('event: complete');
        continue;
      }
      if (chunkStr.includes('data')) {
        if (chunkStr.includes('push')) {
          jest.advanceTimersByTimeAsync(10000);
          continue;
        }
        expect(chunkStr).toContain(`SUBSCRIPTION_SCHEMA_RELOAD`);
        terminated = true;
        continue;
      }
      if (!firstValPushed) {
        firstValPushed = true;
        continue;
      }
    }
  });
});
