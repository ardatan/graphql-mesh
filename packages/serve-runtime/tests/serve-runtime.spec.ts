import { createSchema, createYoga } from 'graphql-yoga';
import { Response } from '@whatwg-node/server';
import { createServeRuntime } from '../src/createServeRuntime';

describe('Serve Runtime', () => {
  describe('Health and Readiness checks', () => {
    const upstreamAPI = createYoga({
      schema: createSchema({
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
      }),
    });
    let upstreamIsUp = true;
    const proxyAPI = createServeRuntime({
      proxy: {
        endpoint: 'http://localhost:4000',
        fetch(info, init, ...args) {
          if (!upstreamIsUp) {
            return Response.error();
          }
          return upstreamAPI.fetch(info, init, ...args);
        },
      },
    });
    beforeEach(() => {
      upstreamIsUp = true;
    });
    it('health check', async () => {
      const res = await proxyAPI.fetch('http://localhost:4000/healthcheck');
      expect(res.status).toBe(200);
    });
    describe('readiness check', () => {
      it('succeed if the proxy API is ready', async () => {
        const res = await proxyAPI.fetch('http://localhost:4000/readiness');
        expect(res.status).toBe(200);
      });
      it('fail if the proxy API is not ready', async () => {
        upstreamIsUp = false;
        const res = await proxyAPI.fetch('http://localhost:4000/readiness');
        expect(res.status).toBe(503);
      });
    });
  });
});
