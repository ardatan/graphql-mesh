/**
 * Transformed Mesh subgraph: Mesh `@source` renames `in_stock` → `inStock`,
 * HTTP transport hits inventory-upstream with original names.
 */
import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';
import { buildSubgraphSchema } from '@graphql-mesh/subgraph';
import { fetch } from '@whatwg-node/fetch';
import { createHitCounter } from './hits.js';

const opts = Opts(process.argv);
const port = opts.getServicePort('inventory', true);
const upstreamPort = opts.getServicePort('inventory-upstream', true);
const hits = createHitCounter();

const typeDefs = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
  directive @source(
    name: String!
    type: String
    subgraph: String!
  ) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | ENUM_VALUE
  directive @transport(
    subgraph: String
    kind: String
    location: String
    headers: [[String!]!]
    options: String
  ) repeatable on SCHEMA

  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])
    @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@source", "@transport"])
    @transport(
      subgraph: "inventory"
      kind: "http"
      location: "http://127.0.0.1:${upstreamPort}/graphql"
    )

  type Query {
    product(id: ID!): Product
  }

  type Product @key(fields: "id") {
    id: ID!
    inStock: Boolean! @source(name: "in_stock", type: "Boolean!", subgraph: "inventory")
  }
`;

async function main() {
  const schema = await buildSubgraphSchema(typeDefs, {
    fetch,
    resolvers: {
      Product: {
        // Entity fill: fetch original `in_stock` from upstream, expose as inStock via @source wrap.
        __resolveReference: async (ref: { id: string }) => {
          const res = await fetch(`http://127.0.0.1:${upstreamPort}/graphql`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              query: /* GraphQL */ `
                query ($id: ID!) {
                  product(id: $id) {
                    id
                    in_stock
                  }
                }
              `,
              variables: { id: ref.id },
            }),
          });
          const body = (await res.json()) as {
            data?: { product?: { id: string; in_stock: boolean } };
          };
          const product = body.data?.product;
          if (!product) return null;
          // Public field after Mesh `@source` wrap is `inStock`.
          return { id: product.id, inStock: product.in_stock, in_stock: product.in_stock };
        },
      },
    },
  });

  const yoga = createYoga({ schema, logging: false, graphqlEndpoint: '/graphql' });
  createServer((req, res) => {
    if (hits.maybeServe(req, res)) return;
    return yoga(req, res);
  }).listen(port, '127.0.0.1', () => {
    console.log(`inventory (Mesh @source + HTTP) at http://127.0.0.1:${port}/graphql`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
