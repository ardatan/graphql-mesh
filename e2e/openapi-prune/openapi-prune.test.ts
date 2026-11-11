import { createTenv, type ServeRunner } from '@e2e/tenv';

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

  describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
    it('should work when pruned', async () => {
      const composition = await compose({
        output: 'graphql',
        services: [await service('Wiki')],
      });

      const { execute } = await serve({
        runner,
        supergraph: composition.output,
        subgraphs: composition.subgraphs,
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
});
