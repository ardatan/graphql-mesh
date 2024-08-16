/* eslint-disable import/no-extraneous-dependencies */
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import {
  buildClientSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  printSchema,
  type ExecutionResult,
  type IntrospectionQuery,
} from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { useDisableIntrospection } from '@envelop/disable-introspection';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { useCustomFetch } from '@graphql-mesh/serve-runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createDisposableServer } from '../../testing/createDisposableServer.js';
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

describe('Hive CDN', () => {
  it('respects env vars', async () => {
    await using cdnServer = await createDisposableServer((_req, res) => {
      const supergraph = getUnifiedGraphGracefully([
        {
          name: 'upstream',
          schema: createUpstreamSchema(),
          url: 'http://upstream/graphql',
        },
      ]);
      res.end(supergraph);
    });
    await using serveRuntime = createServeRuntime({
      supergraph: {
        type: 'hive',
        endpoint: `http://localhost:${cdnServer.address().port}`,
        key: 'key',
      },
    });
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

    // Landing page
    const landingPageRes = await serveRuntime.fetch('http://localhost:4000', {
      method: 'GET',
      headers: {
        accept: 'text/html',
      },
    });
    const landingPage = await landingPageRes.text();
    expect(landingPage).toContain('Hive CDN');
    expect(landingPage).toContain('upstream');
    expect(landingPage).toContain('http://upstream/graphql');
  });
  it('uses Hive CDN instead of introspection for Proxy mode', async () => {
    const upstreamSchema = createUpstreamSchema();
    await using cdnServer = await createDisposableServer((_req, res) => {
      res.end(
        JSON.stringify({
          sdl: printSchemaWithDirectives(upstreamSchema),
        }),
      );
    });
    const upstreamServer = createYoga({
      schema: upstreamSchema,
      plugins: [useDisableIntrospection()],
    });
    let schemaChangeSpy = jest.fn((schema: GraphQLSchema) => {});
    const hiveEndpoint = `http://localhost:${cdnServer.address().port}`;
    const hiveKey = 'key';
    await using serveRuntime = createServeRuntime({
      proxy: { endpoint: 'http://upstream/graphql' },
      schema: {
        type: 'hive',
        endpoint: hiveEndpoint,
        key: hiveKey,
      },
      plugins: () => [
        useCustomFetch(function (url, opts) {
          if (url === 'http://upstream/graphql') {
            return upstreamServer.fetch(url, opts);
          }
          return serveRuntime.fetchAPI.Response.error();
        }),
        {
          onSchemaChange({ schema }) {
            schemaChangeSpy(schema);
          },
        },
      ],
    });
    const res = await serveRuntime.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            foo
          }
        `,
      }),
    });
    const resJson: ExecutionResult = await res.json();
    expect(resJson).toEqual({
      data: {
        foo: 'bar',
      },
    });
    expect(schemaChangeSpy).toHaveBeenCalledTimes(1);
    expect(printSchema(schemaChangeSpy.mock.calls[0][0])).toBe(printSchema(upstreamSchema));
  });
});
