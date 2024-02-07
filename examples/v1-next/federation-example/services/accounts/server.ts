import { readFileSync } from 'fs';
import { join } from 'path';
import { ApolloServer } from 'apollo-server';
import { parse } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = parse(readFileSync(join(__dirname, './typeDefs.graphql'), 'utf8'));

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

export const accountsServer = () =>
  server.listen({ port: 9880 }).then(({ url }) => {
    if (!process.env.CI) {
      console.log(`🚀 Server ready at ${url}`);
    }
    return server;
  });
