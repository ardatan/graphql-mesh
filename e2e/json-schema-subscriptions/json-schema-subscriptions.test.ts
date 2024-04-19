import { createTenv, getAvailablePort } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({ services: [await service('api')], maskServicePorts: true });
  expect(result).toMatchSnapshot();
});

it('should query, mutate and subscribe', async () => {
  const servePort = await getAvailablePort();
  const api = await service('api', { servePort });
  const { output } = await compose({ output: 'graphql', services: [api] });
  const { execute } = await serve({ fusiongraph: output, port: servePort });

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

  const sub = await fetch(`http://0.0.0.0:${servePort}/graphql`, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        subscription TodoAdded {
          todoAdded {
            name
            content
          }
        }
      `,
    }),
  });

  expect(sub.ok).toBeTruthy();

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

  for await (const chunk of sub.body) {
    const msg = Buffer.from(chunk).toString('utf8');
    if (msg.startsWith('event: next')) {
      expect(msg).toMatchInlineSnapshot(`
"event: next
data: {"data":{"todoAdded":{"name":"Shopping","content":"Buy Milk"}}}

"
`);
      break;
    }
  }
});
