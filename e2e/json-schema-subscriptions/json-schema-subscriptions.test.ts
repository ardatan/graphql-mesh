import { setTimeout } from 'node:timers/promises';
import { createClient } from 'graphql-sse';
import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';
import { getAvailablePort } from '../../packages/testing/getAvailablePort';

const { compose, serve, service } = createTenv(__dirname);
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

it('should compose the appropriate schema', async () => {
  const api = await service('api');
  const { result } = await compose({ services: [api], maskServicePorts: true });
  expect(result).toMatchSnapshot();
});

['todoAddedFromSource', 'todoAddedFromExtensions'].forEach(subscriptionField => {
  describe(`Listen to ${subscriptionField}`, () => {
    it('should query, mutate and subscribe', async () => {
      const servePort = await getAvailablePort();
      const api = await service('api', { servePort });
      const { output } = await compose({ output: 'graphql', services: [api] });
      const { hostname, port, execute } = await serve({ supergraph: output, port: servePort });

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
        url: `http://${hostname}:${port}/graphql`,
        retryAttempts: 0,
        fetchFn: fetch,
      });

      const sub = sse.iterate({
        query: /* GraphQL */ `
      subscription ${subscriptionField} {
        ${subscriptionField} {
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
    "${subscriptionField}": {
      "content": "Buy Milk",
      "name": "Shopping",
    },
  },
}
`);
        break;
      }
    });
  });
});

it('should subscribe to todoUpdatedFromExtensions', async () => {
  const servePort = await getAvailablePort();
  const api = await service('api', { servePort });
  const { output } = await compose({ output: 'graphql', services: [api] });
  const { hostname, port, execute } = await serve({ supergraph: output, port: servePort });

  // Add a todo to update and get the id
  let result;
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    result = await execute({
      query: /* GraphQL */ `
        mutation AddTodo {
          addTodo(input: { name: "Shopping", content: "Buy Milk" }) {
            id
            name
            content
          }
        }
      `,
    });
    if (result.data?.addTodo?.id) {
      break;
    }
    await setTimeout(RETRY_DELAY_MS);
  }
  expect(result.errors).toBeFalsy();
  const todoId = result.data?.addTodo?.id;
  expect(todoId).toBeTruthy();

  const sse = createClient({
    url: `http://${hostname}:${port}/graphql`,
    retryAttempts: 0,
    fetchFn: fetch,
  });

  const sub = sse.iterate({
    query: /* GraphQL */ `
      subscription todoUpdatedFromExtensions($id: ID!) {
        todoUpdatedFromExtensions(id: $id) {
          name
          content
        }
      }
    `,
    variables: { id: todoId },
  });

  await expect(
    execute({
      query: /* GraphQL */ `
        mutation UpdateTodo {
          updateTodo(input: { id: "${todoId}", name: "Shopping", content: "Buy Eggs" }) {
            name
            content
          }
        }
      `,
    }),
  ).resolves.toMatchInlineSnapshot(`
{
  "data": {
    "updateTodo": {
      "content": "Buy Eggs",
      "name": "Shopping",
    },
  },
}
`);

  for await (const msg of sub) {
    expect(msg).toMatchInlineSnapshot(`
{
  "data": {
    "todoUpdatedFromExtensions": {
      "content": "Buy Eggs",
      "name": "Shopping",
    },
  },
}
`);
    break;
  }
});
