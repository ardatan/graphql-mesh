/* eslint-disable import/no-extraneous-dependencies */
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type ExecutionResult,
  type IntrospectionQuery,
} from 'graphql';
import { createSchema } from 'graphql-yoga';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { createServeRuntime } from '../src/createServeRuntime.js';

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

const leftovers = new Set<() => PromiseLike<void>>();
afterAll(() => Promise.all(Array.from(leftovers).map(l => l())).finally(() => leftovers.clear()));

describe('Hive CDN', () => {
  afterEach(() => {
    delete process.env.HIVE_CDN_ENDPOINT;
    delete process.env.HIVE_CDN_KEY;
  });
  it('respects env vars', async () => {
    const cdnServer = createServer((_req, res) => {
      const supergraph = getUnifiedGraphGracefully([
        {
          name: 'upstream',
          schema: createUpstreamSchema(),
        },
      ]);
      res.end(supergraph);
    });
    cdnServer.listen();
    leftovers.add(
      () =>
        new Promise<void>((resolve, reject) => {
          cdnServer.close(err => (err ? reject(err) : resolve()));
        }),
    );
    process.env.HIVE_CDN_ENDPOINT = `http://localhost:${(cdnServer.address() as AddressInfo).port}`;
    process.env.HIVE_CDN_KEY = 'key';
    const serveRuntime = createServeRuntime();
    leftovers.add(() => serveRuntime[Symbol.asyncDispose]());
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
