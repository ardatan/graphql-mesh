import { createTenv } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

describe('OpenAPI Additional Resolvers', () => {
  it('composes the schema', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
      maskServicePorts: true,
    });

    expect(result).toMatchSnapshot();
  });
  it('should work with untouched schema', async () => {
    const { output } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
    });

    const { execute } = await serve({ supergraph: output });
    const queryResult = await execute({
      query: /* GraphQL */ `
        mutation Good {
          post_good(input: { banana: true }) {
            apple
          }
        }
      `,
    });

    expect(queryResult.data).toEqual({
      post_good: [
        {
          apple: '{"banana":true}',
        },
      ],
    });
  });

  it('should work with renamed argument', async () => {
    const { output } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
    });

    const { execute } = await serve({ supergraph: output });
    const queryResult = await execute({
      query: /* GraphQL */ `
        mutation Bad {
          post_bad(requestBody: { banana: true }) {
            apple
          }
        }
      `,
    });

    expect(queryResult.data).toEqual({
      post_bad: [
        {
          apple: '{"banana":true}',
        },
      ],
    });
  });
});
