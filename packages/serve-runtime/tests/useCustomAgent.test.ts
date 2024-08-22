import { Agent } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { createServeRuntime, useCustomAgent } from '@graphql-mesh/serve-runtime';
import { createDisposableServer } from '../../testing/createDisposableServer';

function createDisposableAgent() {
  const agent = new Agent();
  return {
    agent,
    [Symbol.dispose]() {
      agent.destroy();
    },
  };
}

describe('useCustomAgent', () => {
  it('should work', async () => {
    await using upstreamServer = await createDisposableServer(
      createYoga<any>({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hello: String!
            }
          `,
          resolvers: {
            Query: {
              hello: () => 'Hello World!',
            },
          },
        }),
      }),
    );
    using disposableAgent = createDisposableAgent();
    // @ts-expect-error - `createConnection` is not available in typings
    const spy = jest.spyOn(disposableAgent.agent, 'createConnection');
    await using serveRuntime = createServeRuntime({
      proxy: {
        endpoint: `http://localhost:${upstreamServer.address().port}/graphql`,
      },
      plugins: () => [useCustomAgent(() => disposableAgent.agent)],
    });
    expect(spy.mock.calls.length).toBe(0);
    const res = await serveRuntime.fetch('http://localhost:4000/graphql', {
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
    const body = await res.json();
    expect(body).toEqual({
      data: {
        hello: 'Hello World!',
      },
    });
    expect(spy.mock.calls.length).toBeGreaterThan(0);
  });
});
