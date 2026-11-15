import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';

const typeDefs = parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8'));

const authors = [
  { id: '0', name: 'John Doe' },
  { id: '1', name: 'Jane Doe' },
];

const resolvers = {
  Query: {
    author(_: unknown, { id }: { id: string }) {
      return authors.find(author => author.id === id);
    },
    authors(_: unknown, { ids }: { ids?: string[] }) {
      return ids ? ids.map(id => authors.find(author => author.id === id)) : authors;
    },
  },
  Author: {
    __resolveReference(object: { id: string }) {
      return authors.find(author => author.id === object.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: Opts(process.argv).getServicePort('authors-fed') },
}).catch(err => {
  console.error(err);
  process.exit(1);
});
