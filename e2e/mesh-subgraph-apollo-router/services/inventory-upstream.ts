/**
 * Upstream GraphQL with original field names (`in_stock`) that Mesh `@source`
 * renames to `inStock` on the inventory subgraph.
 */
import { createServer } from 'node:http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';
import { createHitCounter } from './hits.js';

const opts = Opts(process.argv);
const port = opts.getServicePort('inventory-upstream', true);
const hits = createHitCounter();

const stock: Record<string, { id: string; in_stock: boolean }> = {
  '1': { id: '1', in_stock: true },
  '2': { id: '2', in_stock: false },
};

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      product(id: ID!): Product
    }
    type Product {
      id: ID!
      in_stock: Boolean!
    }
  `,
  resolvers: {
    Query: {
      product: (_: unknown, { id }: { id: string }) => stock[id] || null,
    },
  },
});

const yoga = createYoga({ schema, logging: false, graphqlEndpoint: '/graphql' });
createServer((req, res) => {
  if (hits.maybeServe(req, res)) return;
  return yoga(req, res);
}).listen(port, '127.0.0.1', () => {
  console.log(`inventory-upstream at http://127.0.0.1:${port}/graphql`);
});
