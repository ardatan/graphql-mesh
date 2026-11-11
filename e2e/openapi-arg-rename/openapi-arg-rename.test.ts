import { createTenv, type ServeRunner } from '@e2e/tenv';

describe('OpenAPI Arg Rename', () => {
  const { compose, serve, service } = createTenv(__dirname);
  it('composes the schema', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
      maskServicePorts: true,
    });

    expect(result).toMatchSnapshot();
  });

  describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
    it('should work with untouched schema', async () => {
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
          mutation Good {
            postGood(input: { banana: true }) {
              apple
            }
          }
        `,
      });

      expect(queryResult).toEqual({
        data: {
          postGood: [
            {
              apple: 'good',
            },
          ],
        },
      });
    });

    it('should work with renamed argument', async () => {
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
          mutation Bad {
            postBad(requestBody: { banana: true }) {
              apple
            }
          }
        `,
      });

      expect(queryResult.data).toEqual({
        postBad: [
          {
            apple: 'bad',
          },
        ],
      });
    });
  });
});
