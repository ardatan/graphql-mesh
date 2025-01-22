import { createTenv } from '@e2e/tenv';

describe('OpenAPI Arg Rename', () => {
  const { compose, gateway, service } = createTenv(__dirname);
  it.concurrent('composes the schema', async () => {
    const { supergraphSdl: result } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
      maskServicePorts: true,
    });

    expect(result).toMatchSnapshot();
  });
  it.concurrent('should work with untouched schema', async () => {
    const { supergraphPath } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
    });

    const { execute } = await gateway({ supergraph: supergraphPath });
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

  it.concurrent('should work with renamed argument', async () => {
    const { supergraphPath } = await compose({
      output: 'graphql',
      services: [await service('Wiki')],
    });

    const { execute } = await gateway({ supergraph: supergraphPath });
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
