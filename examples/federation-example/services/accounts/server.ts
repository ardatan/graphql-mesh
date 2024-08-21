import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = parse(/* GraphQL */ `
  type Query {
    me: User
    user(id: ID!): User
    users: [User]
  }

  type User {
    id: ID!
    name: String
    username: String
  }
`);

const resolvers = {
  Query: {
    me() {
      return users[0];
    },
    users() {
      return users;
    },
    user(_root, args) {
      return users.find(user => user.id === args.id);
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const users = [
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
];

export const accountsServer = () =>
  startStandaloneServer(server, {
    listen: {
      port: 9871,
    },
  }).then(({ url }) => {
    if (!process.env.CI) {
      console.log(`🚀 Server ready at ${url}`);
    }
    return server;
  });
