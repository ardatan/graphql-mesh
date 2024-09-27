import { readFileSync } from 'fs';
import { join } from 'path';
import { setTimeout } from 'timers/promises';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginSubscriptionCallback } from '@apollo/server/plugin/subscriptionCallback';
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
      Subscription: {
        countdown: {
          subscribe: async function* (_, { from }: { from: number }) {
            for (let i = from; i > 0; i--) {
              yield i;
              await setTimeout(300);
            }
          },
          resolve: (count: number) => count,
        },
      },
    },
  },
]);

const server = new ApolloServer({ schema, plugins: [ApolloServerPluginSubscriptionCallback()] });

export async function start(port: number): Promise<ApolloServer> {
  await startStandaloneServer(server, { listen: { port } });
  console.log(`Server is running on http://localhost:${port}/graphql`);
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
