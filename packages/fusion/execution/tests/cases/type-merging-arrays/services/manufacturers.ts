import { createGraphQLError, createSchema } from 'graphql-yoga';

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
      manufacturers(ids: [ID!]!): [Manufacturer]!
    }
  `,
  resolvers: {
    Query: {
      manufacturers(root, { ids }) {
        return ids.map(
          id =>
            manufacturers.find(m => m.id === id) ||
            createGraphQLError('Record not found', {
              extensions: {
                code: 'NOT_FOUND',
              },
            }),
        );
      },
    },
  },
});
