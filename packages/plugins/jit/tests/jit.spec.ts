import type { ExecutionResult } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { createGatewayRuntime, useCustomFetch } from '@graphql-hive/gateway-runtime';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';

describe('JIT', () => {
  it('memoizes the compiled query', async () => {
    const graphqlJit: typeof import('graphql-jit') = require('graphql-jit');
    jest.spyOn(graphqlJit, 'compileQuery');
    const { useJIT } = require('../src/index');
    const upstreamSchema = createSchema({
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
    });
    await using upstreamServer = createYoga({
      schema: upstreamSchema,
    });
    await using gw = createGatewayRuntime({
      supergraph: () =>
        getUnifiedGraphGracefully([
          {
            name: 'upstream',
            schema: upstreamSchema,
            url: 'http://localhost:4001/graphql',
          },
        ]),
      plugins: () => [
        useCustomFetch(function (url, options) {
          if (url === 'http://localhost:4001/graphql') {
            return upstreamServer.fetch(url, options);
          }
          return Response.error();
        }),
        useJIT(),
      ],
    });
    async function makeRequest() {
      const res = await gw.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              hello
            }
          `,
        }),
      });
      expect(res.status).toBe(200);
      const body: ExecutionResult = await res.json();
      expect(body.data).toEqual({
        hello: 'world',
      });
    }
    await makeRequest();
    expect(graphqlJit.compileQuery).toHaveBeenCalledTimes(1);
    await makeRequest();
    expect(graphqlJit.compileQuery).toHaveBeenCalledTimes(1);
    await makeRequest();
    expect(graphqlJit.compileQuery).toHaveBeenCalledTimes(1);
  });
});
