import { GraphQLError } from 'graphql';
import { createSchema } from 'graphql-yoga';

const products = [
  { id: '101', upc: '1', retailPrice: 879, unitsInStock: 23 },
  { id: '102', upc: '2', retailPrice: 1279, unitsInStock: 77 },
  { id: '103', upc: '3', retailPrice: 54, unitsInStock: 0 },
];

export const vendorsSchema = createSchema({
  typeDefs: /* GraphQL */ `
    type Product {
      id: ID!
      upc: ID!
      retailPrice: Int
      unitsInStock: Int
    }

    input ProductKey {
      id: ID
      upc: ID
    }

    type Query {
      productsByKeys(keys: [ProductKey!]!): [Product]!
    }
  `,
  resolvers: {
    Query: {
      productsByKeys: (_root, { keys }) =>
        keys.map(
          (k: { id: string; upc: string }) =>
            products.find(p => p.id === k.id || p.upc === k.upc) ||
            new GraphQLError('Record not found', {
              extensions: {
                code: 'NOT_FOUND',
              },
            }),
        ),
    },
  },
});
