import { createSchema } from 'graphql-yoga';
import { createGraphQLError } from '@graphql-tools/utils';

// data fixtures
const manufacturers = [
  { id: '1', name: 'Apple' },
  { id: '2', name: 'Macmillan' },
];

export const manufacturersSchema = createSchema({
  typeDefs: /* GraphQL */ `
    type Manufacturer {
      id: ID!
      name: String!
    }

    type Query {
      manufacturer(id: ID!): Manufacturer
    }
  `,
  resolvers: {
    Query: {
      manufacturer: (root, { id }) =>
        manufacturers.find(m => m.id === id) ||
        createGraphQLError('Record not found', {
          extensions: {
            code: 'NOT_FOUND',
          },
        }),
    },
  },
});
