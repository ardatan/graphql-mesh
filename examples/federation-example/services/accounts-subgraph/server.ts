import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = parse(/* GraphQL */ `
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
`);

const resolvers = {
  User: {
    __resolveReference(object, context) {
      return {
        ...object,
        ...users.find(user => user.id === object.id),
      };
    },
  },
  Query: {
    me(_root, _args, context) {
      return users[0];
    },
    users(_root, _args, context) {
      return users;
    },
    user(_root, args, context) {
      return users.find(user => user.id === args.id);
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

export const accountsSubgraphServer = () =>
  startStandaloneServer(server, { listen: { port: 9880 } }).then(({ url }) => {
    if (!process.env.CI) {
      console.log(`🚀 Server ready at ${url}`);
    }
    return server;
  });
