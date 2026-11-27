/**
 * Normal HTTP Mesh subgraph: `@transport(kind: "http")` via `buildSubgraphSchema`.
 * SDL: `subgraphs/products.graphql` (same source Rover reads via `_service`).
 */
import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';
import { buildSubgraphSchema } from '@graphql-mesh/subgraph';
import { fetch } from '@whatwg-node/fetch';
import { createHitCounter } from './hits.js';
import { loadSubgraphSdl } from './load-subgraph-sdl.js';

const opts = Opts(process.argv);
const port = opts.getServicePort('products', true);
const upstreamPort = opts.getServicePort('products-upstream', true);
const hits = createHitCounter();
const upstreamUrl = `http://127.0.0.1:${upstreamPort}/graphql`;

async function main() {
  const schema = await buildSubgraphSchema(
    {
      typeDefs: loadSubgraphSdl('products', { PRODUCTS_UPSTREAM_URL: upstreamUrl }),
      resolvers: {
        Product: {
          __resolveReference: async (ref: { id: string }) => {
            const res = await fetch(upstreamUrl, {
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
    },
    { fetch },
  );

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
