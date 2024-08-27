import { createSchema, createYoga, type Plugin } from 'graphql-yoga';
import { useCustomFetch } from '@graphql-mesh/serve-runtime';
import { createGatewayRuntime } from '../src/createGatewayRuntime';
import { useForwardHeaders } from '../src/plugins/useForwardHeaders';

describe('useForwardHeaders', () => {
  const requestTrackerPlugin = {
    onParams: jest.fn((() => {}) as Plugin['onParams']),
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
    logging: !!process.env.DEBUG,
  });
  beforeEach(() => {
    requestTrackerPlugin.onParams.mockClear();
  });
  it('forwards specified headers', async () => {
    await using serveRuntime = createGatewayRuntime({
      proxy: {
        endpoint: 'http://localhost:4001/graphql',
      },
      plugins: () => [
        useCustomFetch(upstream.fetch),
        useForwardHeaders(['x-my-header', 'x-my-other']),
      ],
      logging: !!process.env.DEBUG,
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

    // The first call is for the introspection
    expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(2);
    const onParamsPayload = requestTrackerPlugin.onParams.mock.calls[1][0];
    // Do not pass extensions
    expect(onParamsPayload.params.extensions).toBeUndefined();
    const headersObj = Object.fromEntries(onParamsPayload.request.headers.entries());
    expect(headersObj['x-my-header']).toBe('my-value');
    expect(headersObj['x-my-other']).toBe('other-value');
    expect(headersObj['x-extra-header']).toBeUndefined();
  });
  it("forwards specified headers but doesn't override the provided headers", async () => {
    await using serveRuntime = createGatewayRuntime({
      logging: !!process.env.DEBUG,
      proxy: {
        endpoint: 'http://localhost:4001/graphql',
        headers: {
          'x-my-header': 'my-value',
          'x-extra-header': 'extra-value',
        },
      },
      plugins: () => [
        useCustomFetch(upstream.fetch),
        useForwardHeaders(['x-my-header', 'x-my-other']),
      ],
      maskedErrors: false,
    });
    const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-my-header': 'my-new-value',
        'x-my-other': 'other-value',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            hello
          }
        `,
      }),
    });

    const resJson = await response.json();
    expect(resJson).toEqual({
      data: {
        hello: 'world',
      },
    });

    // The first call is for the introspection
    expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(2);
    const onParamsPayload = requestTrackerPlugin.onParams.mock.calls[1][0];
    // Do not pass extensions
    expect(onParamsPayload.params.extensions).toBeUndefined();
    const headersObj = Object.fromEntries(onParamsPayload.request.headers.entries());
    expect(headersObj['x-my-header']).toBe('my-value');
    expect(headersObj['x-extra-header']).toBe('extra-value');
    expect(headersObj['x-my-other']).toBe('other-value');
  });
});
