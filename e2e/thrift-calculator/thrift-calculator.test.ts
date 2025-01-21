import { createTenv } from '@e2e/tenv';

const { compose, service, gateway } = createTenv(__dirname);

it.concurrent('should compose the appropriate schema', async () => {
  const { supergraphSdl: result } = await compose({
    services: [await service('calculator')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'Add',
    query: /* GraphQL */ `
      query Add {
        add(request: { left: 2, right: 3 })
      }
    `,
  },
])('should execute $name', async ({ query }) => {
  const { supergraphPath } = await compose({
    services: [await service('calculator')],
    output: 'graphql',
  });

  const { execute } = await gateway({ supergraph: supergraphPath });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
