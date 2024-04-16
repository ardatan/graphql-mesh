import { createGraphQLError, createSchema } from 'graphql-yoga';

// data fixtures
const products = [
  { upc: '1', name: 'iPhone', price: 699.99, manufacturerId: '1' },
  { upc: '2', name: 'Apple Watch', price: 399.99, manufacturerId: '2' },
  { upc: '3', name: 'Super Baking Cookbook', price: 15.99, manufacturerId: '2' },
  { upc: '4', name: 'Best Selling Novel', price: 7.99, manufacturerId: '2' },
  { upc: '5', name: 'iOS Survival Guide', price: 24.99, manufacturerId: '1' },
  { upc: '6', name: 'Baseball Glove', price: 17.99, manufacturerId: '99' }, // << invalid manufacturer!
];

export const productsSchema = createSchema({
  typeDefs: /* GraphQL */ `
    type Product {
      manufacturer: Manufacturer
      name: String!
      price: Float!
      upc: ID!
    }

    type Manufacturer {
      id: ID!
      products: [Product]!
    }

    type Query {
      product(upc: ID!): Product
      products(upcs: [ID!]!): [Product]!
      _manufacturers(ids: [ID!]!): [Manufacturer]!
    }
  `,
  resolvers: {
    Query: {
      product(root, { upc }) {
        return (
          products.find(p => p.upc === upc) ||
          createGraphQLError('Record not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          })
        );
      },
      products(root, { upcs }) {
        return upcs.map(
          upc =>
            products.find(p => p.upc === upc) ||
            createGraphQLError('Record not found', {
              extensions: {
                code: 'NOT_FOUND',
              },
            }),
        );
      },
      _manufacturers(root, { ids }) {
        return ids.map(id => ({ id, products: products.filter(p => p.manufacturerId === id) }));
      },
    },
    Product: {
      manufacturer: product => ({ id: product.manufacturerId }),
    },
    Manufacturer: {
      products: manufacturer => products.filter(p => p.manufacturerId === manufacturer.id),
    },
  },
});
