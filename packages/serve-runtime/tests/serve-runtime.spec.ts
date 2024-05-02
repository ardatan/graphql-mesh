/* eslint-disable import/no-extraneous-dependencies */
import { createSchema, createYoga } from 'graphql-yoga';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { Response } from '@whatwg-node/server';
import { createServeRuntime } from '../src/createServeRuntime.js';

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
      fusiongraphAPI: createServeRuntime({
        fusiongraph: () => {
          if (!upstreamIsUp) {
            throw new Error('Upstream is down');
          }
          return composeSubgraphs([
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
        it('health check', async () => {
          const res = await serveRuntime.fetch('http://localhost:4000/healthcheck');
          expect(res.status).toBe(200);
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
      });
    });
  });
});
