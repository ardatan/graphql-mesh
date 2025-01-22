import { createTenv } from '@e2e/tenv';

const { compose, gateway, service } = createTenv(__dirname);

describe('OpenAPI w/ Prune Transform', () => {
  it.concurrent('composes', async () => {
    const { supergraphSdl: result } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
  });
  it.concurrent('should work when pruned', async () => {
    const { supergraphPath } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
    });

    const { execute } = await gateway({ supergraph: supergraphPath });
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
