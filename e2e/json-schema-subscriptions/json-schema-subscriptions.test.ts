import { createClient } from 'graphql-sse';
import { createTenv } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';
import { getAvailablePort } from '../../packages/testing/getAvailablePort';

const { compose, serve, service } = createTenv(__dirname);

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
