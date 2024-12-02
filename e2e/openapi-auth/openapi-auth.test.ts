import { createTenv } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

it('processes env variables', async () => {
  const authService = await service('auth');
  const { output } = await compose({
    services: [authService],
    output: 'graphql',
  });
  const { execute } = await serve({
    supergraph: output,
    env: {
      AUTH_TOKEN: 'MY_TOKEN',
    },
  });
  const result = await execute({
    query: /* GraphQL */ `
      query {
        me {
          ... on Error {
            message
          }
          ... on User {
            id
            name
            email
          }
        }
      }
    `,
  });
  expect(result).toEqual({
    data: {
      me: {
        id: '1',
        name: 'John Doe',
        email: 'john@doe.com',
      },
    },
  });
});
