import { createTenv } from '@e2e/tenv';

describe('OpenAPI HATEOAS', () => {
  let server: any;

  beforeAll(done => {
    server = require('./server.js');
    done();
  });

  afterAll(done => {
    server.close(done);
  });

  const { compose, serve } = createTenv(__dirname);

  it('should compose', async () => {
    const { result } = await compose({ output: 'graphql' });
    expect(result).toMatchSnapshot();
  });

  it('should execute and follow HATEOAS links', async () => {
    const { output } = await compose({ output: 'graphql' });

    const { execute } = await serve({ supergraph: output });
    const queryResult = await execute({
      query: /* GraphQL */ `
        query GetProductsById {
          getProductById(id: 1) {
            id
            name
            supplierId
            supplier {
              id
              name
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
        supplier: {
          id: 11,
          name: 'Tech Supplier Inc.',
        },
      },
    });
  });
});
