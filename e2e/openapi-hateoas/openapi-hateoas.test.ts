import { createTenv } from '@e2e/tenv';

describe('OpenAPI HATEOAS', () => {
  it.concurrent('should compose', async () => {
    await using tenv = createTenv(__dirname);
    await using OASService = await tenv.service('OASService');
    await using composition = await tenv.compose({
      output: 'graphql',
      services: [OASService],
      maskServicePorts: true,
    });
    expect(composition.supergraphSdl).toMatchSnapshot();
  });

  it.concurrent('should execute and follow HATEOAS links', async () => {
    await using tenv = createTenv(__dirname);
    await using OASService = await tenv.service('OASService');
    await using composition = await tenv.compose({
      output: 'graphql',
      services: [OASService],
    });

    const gw = await tenv.gateway({
      supergraph: composition.supergraphPath,
    });
    const queryResult = await gw.execute({
      query: /* GraphQL */ `
        query GetProductsById {
          getProductById(id: 1) {
            ... on Electronics {
              id
              name
              supplierId
              warranty
              self {
                id
                name
              }
              supplier {
                id
                name
              }
            }
          }
        }
      `,
    });

    expect(queryResult.errors).toBeFalsy();

    expect(queryResult.data).toEqual({
      getProductById: {
        id: 1,
        name: 'Laptop',
        supplierId: 11,
        warranty: '01-01-2027',
        self: {
          id: 1,
          name: 'Laptop',
        },
        supplier: {
          id: 11,
          name: 'Tech Supplier Inc.',
        },
      },
    });
  });
});
