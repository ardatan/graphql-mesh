import { createSchema, createYoga } from 'graphql-yoga';
import { createServeRuntime } from '../src/createServeRuntime';
import { useForwardHeaders } from '../src/useForwardHeaders';

describe('useForwardHeaders', () => {
  const upstream = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        scalar JSON

        type Query {
          headers: JSON
        }
      `,
      resolvers: {
        Query: {
          headers(_root, _args, context) {
            return Object.fromEntries(context.request.headers.entries());
          },
        },
      },
    }),
  });
  const serveRuntime = createServeRuntime({
    proxy: {
      endpoint: 'https://example.com/graphql',
      fetch: upstream.fetch,
    },
    plugins: () => [
      useForwardHeaders({
        headerNames: ['x-my-header', 'x-my-other'],
      }),
    ],
  });

  it('forwards headers', async () => {
    const response = await serveRuntime.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'x-my-header': 'my-value',
        'x-my-other': 'other-value',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            headers
          }
        `,
      }),
    });

    const resJson = await response.json();

    expect(resJson).toMatchObject({
      data: {
        headers: {
          'x-my-other': 'other-value',
          'x-my-header': 'my-value',
        },
      },
    });
  });
});
