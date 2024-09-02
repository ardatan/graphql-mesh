import { createClient } from 'graphql-sse';
import { createTenv, getAvailablePort } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

const { compose, serve, service } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({ services: [await service('api')], maskServicePorts: true });
  expect(result).toMatchSnapshot();
});

it('should query, mutate and subscribe', async () => {
  const servePort = await getAvailablePort();
  const api = await service('api', { servePort });
  const { output } = await compose({ output: 'graphql', services: [api] });
  const { execute } = await serve({ supergraph: output, port: servePort });

  await expect(
    execute({
      query: /* GraphQL */ `
        query Todos {
          todos {
            name
            content
          }
        }
      `,
    }),
  ).resolves.toMatchInlineSnapshot(`
{
  "data": {
    "todos": [],
  },
}
`);

  const sse = createClient({
    url: `http://localhost:${servePort}/graphql`,
    retryAttempts: 0,
    fetchFn: fetch,
  });

  const sub = sse.iterate({
    query: /* GraphQL */ `
      subscription TodoAdded {
        todoAdded {
          name
          content
        }
      }
    `,
  });

  await expect(
    execute({
      query: /* GraphQL */ `
        mutation AddTodo {
          addTodo(input: { name: "Shopping", content: "Buy Milk" }) {
            name
            content
          }
        }
      `,
    }),
  ).resolves.toMatchInlineSnapshot(`
{
  "data": {
    "addTodo": {
      "content": "Buy Milk",
      "name": "Shopping",
    },
  },
}
`);

  for await (const msg of sub) {
    expect(msg).toMatchInlineSnapshot(`
{
  "data": {
    "todoAdded": {
      "content": "Buy Milk",
      "name": "Shopping",
    },
  },
}
`);
    break;
  }
});
