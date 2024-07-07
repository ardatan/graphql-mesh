import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should execute Metrics with banana', async () => {
  const { output, result } = await compose({ output: 'graphql' });

  expect(result).toMatchSnapshot();

  const { execute } = await serve({ supergraph: output });
  const queryResult = await execute({
    query: /* GraphQL */ `
    query Categories {
      jokes_categories
    }
  ` });

  expect(queryResult.errors).toBeFalsy();
});
