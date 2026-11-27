/**
 * Normal HTTP Mesh subgraph: `@transport(kind: "http")` via `buildSubgraphSchema`
 * wrapping a remote GraphQL upstream.
 */
import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';
import { buildSubgraphSchema } from '@graphql-mesh/subgraph';
import { fetch } from '@whatwg-node/fetch';
import { createHitCounter } from './hits.js';

const opts = Opts(process.argv);
const port = opts.getServicePort('products', true);
const upstreamPort = opts.getServicePort('products-upstream', true);
const hits = createHitCounter();

const typeDefs = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
  directive @transport(
    subgraph: String
    kind: String
    location: String
    headers: [[String!]!]
    options: String
  ) repeatable on SCHEMA

  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])
    @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
    @transport(
      subgraph: "products"
      kind: "http"
      location: "http://127.0.0.1:${upstreamPort}/graphql"
    )

  type Query {
    product(id: ID!): Product
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String!
  }
`;

async function main() {
  const schema = await buildSubgraphSchema(typeDefs, {
    fetch,
    resolvers: {
      Product: {
        // Entity fill for Product.name (wrapSchema proxy cannot run from @lookup info).
        __resolveReference: async (ref: { id: string }) => {
          const res = await fetch(`http://127.0.0.1:${upstreamPort}/graphql`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              query: /* GraphQL */ `
                query ($id: ID!) {
                  product(id: $id) {
                    id
                    name
                  }
                }
              `,
              variables: { id: ref.id },
            }),
          });
          const body = (await res.json()) as {
            data?: { product?: { id: string; name: string } };
          };
          return body.data?.product ?? null;
        },
      },
    },
  });

  const yoga = createYoga({ schema, logging: false, graphqlEndpoint: '/graphql' });
  createServer((req, res) => {
    if (hits.maybeServe(req, res)) return;
    return yoga(req, res);
  }).listen(port, '127.0.0.1', () => {
    console.log(`products (HTTP Mesh) at http://127.0.0.1:${port}/graphql`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
