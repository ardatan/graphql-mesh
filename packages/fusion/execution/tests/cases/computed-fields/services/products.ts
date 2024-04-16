import { GraphQLError } from 'graphql';
import { createSchema } from 'graphql-yoga';

// data fixtures
const products = [
  { upc: '1', name: 'iPhone', price: 699.99, categoryId: null, metadataIds: [] },
  {
    upc: '2',
    name: 'The Best Baking Cookbook',
    price: 15.99,
    categoryId: '2',
    metadataIds: ['3', '4'],
  },
  { upc: '3', name: 'Argentina Guidebook', price: 24.99, categoryId: '3', metadataIds: ['5'] },
  { upc: '4', name: 'Soccer Jersey', price: 47.99, categoryId: '1', metadataIds: ['1', '2'] },
];

export const productsSchema = createSchema({
  typeDefs: /* GraphQL */ `
    type Product {
      categoryId: ID
      metadataIds: [ID!]
      name: String!
      price: Float!
      upc: ID!
    }

    type Query {
      products(upcs: [ID!]!): [Product]!
    }
  `,
  resolvers: {
    Query: {
      products: (root, { upcs }) =>
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
