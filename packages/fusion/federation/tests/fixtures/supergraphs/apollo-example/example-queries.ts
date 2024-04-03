const fragments = {
  Review: /* GraphQL */ `
    fragment Review on Review {
      id
      body
    }
  `,
  Product: /* GraphQL */ `
    fragment Product on Product {
      inStock
      name
      price
      shippingEstimate
      upc
      weight
    }
  `,
  User: /* GraphQL */ `
    fragment User on User {
      id
      username
      name
    }
  `,
};

export const exampleQueries = {
  topProducts: /* GraphQL */ `
    ${fragments.Product}
    ${fragments.Review}
    ${fragments.User}
    query TestQuery {
      topProducts {
        ...Product
        reviews {
          ...Review
          author {
            ...User
          }
        }
      }
    }
  `,
  users: /* GraphQL */ `
    ${fragments.Product}
    ${fragments.Review}
    ${fragments.User}
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
    }
  `,
};
