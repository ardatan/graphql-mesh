import { createTenv } from '@e2e/tenv';

const { service, serve, composeWithApollo } = createTenv(__dirname);

const query = /* GraphQL */ `
  fragment User on User {
    id
    username
    name
  }

  fragment Review on Review {
    id
    body
  }

  fragment Product on Product {
    inStock
    name
    price
    shippingEstimate
    upc
    weight
  }

  query TestQuery {
    users {
      ...User
      reviews {
        ...Review
        product {
          ...Product
          reviews {
            ...Review
            author {
              ...User
              reviews {
                ...Review
                product {
                  ...Product
                }
              }
            }
          }
        }
      }
    }
    topProducts {
      ...Product
      reviews {
        ...Review
        author {
          ...User
          reviews {
            ...Review
            product {
              ...Product
            }
          }
        }
      }
    }
  }
`;

it('should consistently explain the query plan', async () => {
  const accounts = await service('accounts');
  const inventory = await service('inventory');
  const products = await service('products');
  const reviews = await service('reviews');
  const { output } = await composeWithApollo({
    services: [accounts, inventory, products, reviews],
  });
  const { execute } = await serve({
    supergraph: output,
  });
  await expect(
    execute({
      query,
    }),
  ).resolves.toMatchSnapshot();
});
