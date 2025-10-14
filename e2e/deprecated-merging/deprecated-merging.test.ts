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
    name: 'Query rootField',
    query: /* GraphQL */ `
      query {
        rootField(deprecatedArg: VALUE1, otherArg: 1) {
          id
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
