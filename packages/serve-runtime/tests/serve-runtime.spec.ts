/* eslint-disable import/no-extraneous-dependencies */
import { createServer } from 'http';
import { AddressInfo } from 'net';
import AsyncDisposableStack from 'disposablestack/AsyncDisposableStack';
import {
  buildClientSchema,
  ExecutionResult,
  getIntrospectionQuery,
  IntrospectionQuery,
  printSchema,
} from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { composeSubgraphs, getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { Response } from '@whatwg-node/server';
import { createServeRuntime } from '../src/createServeRuntime.js';

describe('Serve Runtime', () => {
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
            schema: upstreamSchema,
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
          query: getIntrospectionQuery(),
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
});
