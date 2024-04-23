import { createTenv } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
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
  const { target } = await compose({
    services: [await service('calculator')],
    target: 'graphql',
  });

  const { execute } = await serve({ fusiongraph: target });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
