import { createTenv, type Container } from '@e2e/tenv';

const { compose, service, serve, container } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('subgraph-a')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'Query foo',
    query: /* GraphQL */ `
      query {
        SubgraphA {
          foo(id: "123") {
            id
          }
        }
      }
    `,
  },
])('should execute $name', async ({ query }) => {
  const { output } = await compose({
    output: 'graphql',
    services: [await service('subgraph-a')],
  });
  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
