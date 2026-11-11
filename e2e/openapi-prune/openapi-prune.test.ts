import { createTenv } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

describe('OpenAPI w/ Prune Transform', () => {
  it('composes', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
  });

  // Mutation-only OpenAPI + Mesh `Query.dummy` — Apollo Router Connectors marks
  // non-`@connect` Query fields inaccessible and rejects an empty Query API schema.
  it('should work when pruned', async () => {
    const composition = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
    });

    const { execute } = await serve({
      runner: 'hive',
      supergraph: composition.output,
    });
    const queryResult = await execute({
      query: /* GraphQL */ `
        mutation Main {
          post_main(input: { banana: true }) {
            apple
          }
        }
      `,
    });

    expect(queryResult.data).toEqual({
      post_main: [
        {
          apple: 'correct',
        },
      ],
    });
  });
});
