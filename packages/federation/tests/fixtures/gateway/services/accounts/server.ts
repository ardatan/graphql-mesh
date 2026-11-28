import { readFileSync } from 'fs';
import { join } from 'path';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';

export const typeDefs = parse(
  readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8'),
);

export const resolvers = {
  User: {
    __resolveReference(object: any, _context: any) {
      return {
        ...object,
        ...users.find((user) => user.id === object.id),
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
      return users.find((user) => user.id === args.id);
    },
  },
};

export const schema = buildSubgraphSchema([
  {
    typeDefs,
    resolvers,
  },
]);

export const server = new ApolloServer({
  schema,
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
