import { ApolloServer, gql } from 'apollo-server';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = gql`
  extend type Query {
    me: User
    user(id: ID!): User
    users: [User]
  }

  type User @key(fields: "id") {
    id: ID!
    name: String
    username: String
  }
`;

const resolvers = {
  User: {
    __resolveReference(object, context) {
      return {
        ...object,
        ...context.users.find(user => user.id === object.id),
      };
    },
  },
  Query: {
    me(_root, _args, context) {
      return context.users[0];
    },
    users(_root, _args, context) {
      return context.users;
    },
    user(_root, args, context) {
      return context.users.find(user => user.id === args.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([
    {
      typeDefs,
      resolvers,
    },
  ]),
  context: {
    users: [
      {
        id: '1',
        name: 'Ada Lovelace',
        birthDate: '1815-12-10',
        username: '@ada',
      },
      {
        id: '2',
        name: 'Alan Turing',
        birthDate: '1912-06-23',
        username: '@complete',
      },
    ],
  },
});

export const accountsSubgraphServer = () =>
  server.listen({ port: 9880 }).then(({ url }) => {
    if (!process.env.CI) {
      console.log(`🚀 Server ready at ${url}`);
    }
    return server;
  });
