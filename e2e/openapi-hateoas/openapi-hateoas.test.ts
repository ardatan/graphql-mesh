import { createTenv, type Service } from '@e2e/tenv';

describe('OpenAPI HATEOAS', () => {
  const { compose, serve, service } = createTenv(__dirname);

  let oasService: Service;

  beforeAll(async () => {
    oasService = await service('OASService');
  });

  it('should compose', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [oasService],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
  });

  it('should execute and follow HATEOAS links', async () => {
    const { output } = await compose({
      output: 'graphql',
      services: [oasService],
    });

    const { execute } = await serve({
      supergraph: output,
    });
    const queryResult = await execute({
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
