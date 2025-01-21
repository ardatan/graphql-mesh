import { createTenv } from '@e2e/tenv';

const { compose, service, gateway } = createTenv(__dirname);

it.concurrent('should compose the appropriate schema', async () => {
  const { supergraphSdl: result } = await compose({
    services: [await service('api')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'User',
    query: /* GraphQL */ `
      fragment UserF on User {
        id
        name
      }
      query User {
        john: user(id: 1) {
          ...UserF
        }
        jane: user(id: 2) {
          ...UserF
        }
      }
    `,
  },
])('should execute $name', async ({ query }) => {
  const { supergraphPath } = await compose({ output: 'graphql', services: [await service('api')] });
  const { execute } = await gateway({ supergraph: supergraphPath });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
