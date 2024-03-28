import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = parse(readFileSync(join(__dirname, './typeDefs.graphql'), 'utf8'));

const resolvers = {
  User: {
    __resolveReference(object: any, _context: any) {
      return {
        ...object,
        ...users.find(user => user.id === object.id),
      };
    },
  },
  Query: {
    me(_root: any, _args: any, _context: any) {
      return users[0];
    },
    users(_root: any, _args: any, _context: any) {
      return users;
    },
    user(_root: any, args: any, _context: any) {
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

export const accountsServer = () =>
  startStandaloneServer(server, { listen: { port: 9880 } }).then(({ url }) => {
    if (!process.env.CI) {
      console.log(`🚀 Server ready at ${url}`);
    }
    return server;
  });
