/* eslint-disable import/no-extraneous-dependencies */
import { createSchema, createYoga } from 'graphql-yoga';
import { OnParamsHook } from 'graphql-yoga/typings/plugins/types';
import { MeshFetch } from '@graphql-mesh/types';
import { createServeRuntime } from '../src/createServeRuntime';
import { useForwardHeaders } from '../src/useForwardHeaders';

describe('useForwardHeaders', () => {
  it('forwards headers', async () => {
    const requestTrackerPlugin = {
      onParams: jest.fn((() => {}) as OnParamsHook),
    };
    const upstream = createYoga({
      schema: createSchema({
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
      }),
      plugins: [requestTrackerPlugin],
    });
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
      },
      fetchAPI: {
        fetch: upstream.fetch as MeshFetch,
      },
      plugins: () => [useForwardHeaders(['x-my-header', 'x-my-other'])],
    });
    const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'x-my-header': 'my-value',
        'x-my-other': 'other-value',
        'x-extra-header': 'extra-value',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            hello
          }
        `,
        extensions: {
          randomThing: 'randomValue',
        },
      }),
    });

    const resJson = await response.json();
    expect(resJson).toEqual({
      data: {
        hello: 'world',
      },
    });

    expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(1);
    const onParamsPayload = requestTrackerPlugin.onParams.mock.calls[0][0];
    // Do not pass extensions
    expect(onParamsPayload.params.extensions).toBeUndefined();
    const headersObj = Object.fromEntries(onParamsPayload.request.headers.entries());
    expect(headersObj['x-my-header']).toBe('my-value');
    expect(headersObj['x-my-other']).toBe('other-value');
    expect(headersObj['x-extra-header']).toBeUndefined();
  });
});
