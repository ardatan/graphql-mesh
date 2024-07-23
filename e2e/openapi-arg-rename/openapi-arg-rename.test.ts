import { createTenv } from '@e2e/tenv';

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
  it('should work with untouched schema', async () => {
    const { output } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
    });

    const { execute } = await serve({ supergraph: output });
    const queryResult = await execute({
      query: /* GraphQL */ `
        mutation Good {
          postGood(input: { banana: true }) {
            apple
          }
        }
      `,
    });

    expect(queryResult.data).toEqual({
      postGood: [
        {
          apple: 'good',
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
