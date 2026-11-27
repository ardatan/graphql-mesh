/**
 * Plain GraphQL upstream that the Mesh HTTP products subgraph wraps.
 */
import { createServer } from 'node:http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';
import { createHitCounter } from './hits.js';

const opts = Opts(process.argv);
const port = opts.getServicePort('products-upstream', true);
const hits = createHitCounter();

const products: Record<string, { id: string; name: string }> = {
  '1': { id: '1', name: 'Mesh Widget' },
  '2': { id: '2', name: 'Router Gadget' },
};

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      product(id: ID!): Product
    }
    type Product {
      id: ID!
      name: String!
    }
  `,
  resolvers: {
    Query: {
      product: (_: unknown, { id }: { id: string }) => products[id] || null,
    },
  },
});

const yoga = createYoga({ schema, logging: false, graphqlEndpoint: '/graphql' });
createServer((req, res) => {
  if (hits.maybeServe(req, res)) return;
  return yoga(req, res);
}).listen(port, '127.0.0.1', () => {
  console.log(`products-upstream at http://127.0.0.1:${port}/graphql`);
});
