import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';

const schema = buildSubgraphSchema([
  {
    typeDefs: parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8')),
    resolvers: {
      Product: {
        reviews(product: any) {
          return reviews.filter(review => review.product.id === product.id);
        },
      },
    },
  },
]);

const server = new ApolloServer({ schema });

export async function start(port: number): Promise<ApolloServer> {
  await startStandaloneServer(server, { listen: { port } });
  return server;
}

const reviews = [
  {
    product: { id: '1' },
    score: 10,
  },
  {
    product: { id: '2' },
    score: 10,
  },
  {
    product: { id: '3' },
    score: 10,
  },
  {
    product: { id: '1' },
    score: 10,
  },
];
