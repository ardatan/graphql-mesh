import { GraphQLError } from 'graphql';
import { createSchema } from 'graphql-yoga';

// data fixtures
const users = [
  { id: '1', username: 'hanshotfirst' },
  { id: '2', username: 'bigvader23' },
];

export const usersSchema = createSchema({
  typeDefs: /* GraphQL */ `
    type User {
      id: ID!
      username: String!
    }

    type Query {
      users(ids: [ID!]!): [User]!
    }
  `,
  resolvers: {
    Query: {
      users: (_root, { ids }) =>
        ids.map(
          (id: string) =>
            users.find(u => u.id === id) ||
            new GraphQLError('Record not found', {
              extensions: {
                code: 'NOT_FOUND',
              },
            }),
        ),
    },
  },
});
