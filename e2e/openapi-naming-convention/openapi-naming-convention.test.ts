import { createTenv, type ServeRunner } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose', async () => {
  const { result } = await compose({ output: 'graphql' });
  expect(result).toMatchSnapshot();
});

describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
  it('should execute jokes_categories', async () => {
    const composition = await compose({ output: 'graphql' });

    const { execute } = await serve({
      runner,
      supergraph: composition.output,
    });
    const queryResult = await execute({
      query: /* GraphQL */ `
        query Categories {
          jokes_categories
        }
      `,
    });

    expect(queryResult.errors).toBeFalsy();
  });
});
