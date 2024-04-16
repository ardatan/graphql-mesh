import { GraphQLError } from 'graphql';
import { createSchema } from 'graphql-yoga';

// data fixtures
const products = [
  { id: '1', name: 'iPhone', price: 699.99 },
  { id: '2', name: 'Apple Watch', price: 399.99 },
  { id: '3', name: 'Super Baking Cookbook', price: 15.99 },
  { id: '4', name: 'Best Selling Novel', price: 7.99 },
  { id: '5', name: 'iOS Survival Guide', price: 24.99 },
];

export const productsSchema = createSchema({
  typeDefs: /* GraphQL */ `
    interface ProductOffering {
      id: ID!
      name: String!
      price: Float!
    }

    type Product implements ProductOffering {
      id: ID!
      name: String!
      price: Float!
    }

    type Query {
      products(ids: [ID!]!): [Product]!
      product(id: ID!): Product
    }
  `,
  resolvers: {
    Query: {
      products: (root, { ids }) =>
        ids.map(
          (id: string) =>
            products.find(p => p.id === id) ||
            new GraphQLError('Record not found', {
              extensions: {
                code: 'NOT_FOUND',
              },
            }),
        ),
      product: (_root, { id }) =>
        products.find(p => p.id === id) ||
        new GraphQLError('Record not found', {
          extensions: {
            code: 'NOT_FOUND',
          },
        }),
    },
  },
});
