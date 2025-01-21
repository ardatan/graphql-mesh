import { createTenv } from '@e2e/tenv';

it.concurrent('should compose the appropriate schema', async () => {
  await using tenv = createTenv(__dirname);
  await using accounts = await tenv.service('accounts');
  await using inventory = await tenv.service('inventory');
  await using products = await tenv.service('products');
  await using reviews = await tenv.service('reviews');
  await using composition = await tenv.compose({
    services: [accounts, inventory, products, reviews],
    maskServicePorts: true,
  });
  expect(composition.supergraphSdl).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'TestQuery',
    query: /* GraphQL */ `
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
    `,
  },
])('should execute $name', async ({ query }) => {
  await using tenv = createTenv(__dirname);
  await using accounts = await tenv.service('accounts');
  await using inventory = await tenv.service('inventory');
  await using products = await tenv.service('products');
  await using reviews = await tenv.service('reviews');
  await using composition = await tenv.compose({
    output: 'graphql',
    services: [accounts, inventory, products, reviews],
  });
  await using gw = await tenv.gateway({ supergraph: composition.supergraphPath });
  await expect(gw.execute({ query })).resolves.toMatchSnapshot();
});
