import { createSchema, createYoga, Plugin } from 'graphql-yoga';
import { createServeRuntime } from '../src/createServeRuntime';
import { useForwardHeaders } from '../src/useForwardHeaders';

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
  });
  beforeEach(() => {
    requestTrackerPlugin.onParams.mockClear();
  });
  it('forwards specified headers', async () => {
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
      },
      fetchAPI: {
        fetch: upstream.fetch as any,
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
  it("forwards specified headers but doesn't override the provided headers", async () => {
    const serveRuntime = createServeRuntime({
      proxy: {
        endpoint: 'https://example.com/graphql',
        headers: {
          'x-my-header': 'my-value',
          'x-extra-header': 'extra-value',
        },
      },
      fetchAPI: {
        // TODO: Fix the type mismatch
        fetch: upstream.fetch as any,
      },
      plugins: () => [useForwardHeaders(['x-my-header', 'x-my-other'])],
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

    expect(requestTrackerPlugin.onParams).toHaveBeenCalledTimes(1);
    const onParamsPayload = requestTrackerPlugin.onParams.mock.calls[0][0];
    // Do not pass extensions
    expect(onParamsPayload.params.extensions).toBeUndefined();
    const headersObj = Object.fromEntries(onParamsPayload.request.headers.entries());
    expect(headersObj['x-my-header']).toBe('my-value');
    expect(headersObj['x-extra-header']).toBe('extra-value');
    expect(headersObj['x-my-other']).toBe('other-value');
  });
});
