import { GraphQLError } from 'graphql';
import { createSchema } from 'graphql-yoga';

// data fixtures
const products = [
  { upc: '1', name: 'Cookbook', price: 15.99 },
  { upc: '2', name: 'Toothbrush', price: 3.99 },
];

export const productsSchema = createSchema({
  typeDefs: /* GraphQL */ `
    type Product {
      upc: ID!
      name: String!
      price: Float!
    }

    type Query {
      products(upcs: [ID!]!): [Product]!
    }
  `,
  resolvers: {
    Query: {
      products: (_root, { upcs }) =>
        upcs.map(
          (upc: string) =>
            products.find(p => p.upc === upc) ||
            new GraphQLError('Record not found', {
              extensions: {
                code: 'NOT_FOUND',
              },
            }),
        ),
    },
  },
});
