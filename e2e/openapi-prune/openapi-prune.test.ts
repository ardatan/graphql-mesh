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
  it('should work when pruned', async () => {
    const { output } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
    });

    const { execute } = await serve({ supergraph: output });
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
