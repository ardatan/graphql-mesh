/**
 * Plain Federation reviews subgraph that extends Product so Apollo Router must
 * call the Mesh products subgraph `_entities` (wired via `@lookup` / `@connect`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);
const port = opts.getServicePort('reviews', true);

const typeDefs = parse(readFileSync(join(__dirname, 'reviews.graphql'), 'utf8'));

const reviews: Record<
  string,
  { id: string; body: string; product: { __typename: string; id: string } }
> = {
  r1: { id: 'r1', body: 'Great widget', product: { __typename: 'Product', id: '1' } },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([
    {
      typeDefs,
      resolvers: {
        Query: {
          review: (_: unknown, { id }: { id: string }) => reviews[id] || null,
        },
        Review: {
          product: (parent: { product: { id: string } }) => parent.product,
        },
      },
    },
  ]),
});

startStandaloneServer(server, {
  listen: { port, host: '127.0.0.1' },
})
  .then(() => {
    console.log(`Reviews subgraph at http://127.0.0.1:${port}/graphql`);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
