import { createTenv } from '@e2e/tenv';

const { compose, gateway } = createTenv(__dirname);

it.concurrent('should compose', async () => {
  const { supergraphSdl: result } = await compose({ output: 'graphql' });
  expect(result).toMatchSnapshot();
});

it.concurrent('should execute Metrics with banana', async () => {
  const { supergraphPath } = await compose({ output: 'graphql' });

  const { execute } = await gateway({ supergraph: supergraphPath });
  const queryResult = await execute({
    query: /* GraphQL */ `
      query Categories {
        jokes_categories
      }
    `,
  });

  expect(queryResult.errors).toBeFalsy();
});
