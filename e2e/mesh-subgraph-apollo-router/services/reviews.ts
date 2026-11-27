/**
 * `@lookup` / `@is` entity subgraph via `buildSubgraphSchema`.
 * Apollo Router `_entities` for Product.reviews goes through Mesh `@lookup`.
 */
import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';
import { buildSubgraphSchema } from '@graphql-mesh/subgraph';
import { createHitCounter } from './hits.js';

const opts = Opts(process.argv);
const port = opts.getServicePort('reviews', true);
const hits = createHitCounter();

const reviewsById: Record<
  string,
  { id: string; body: string; productId: string; authorId: string }
> = {
  r1: { id: 'r1', body: 'Great widget', productId: '1', authorId: 'u1' },
};

const reviewsByProduct: Record<string, (typeof reviewsById)[string][]> = {
  '1': [reviewsById.r1],
};

const typeDefs = /* GraphQL */ `
  directive @link(url: String!, import: [String]) repeatable on SCHEMA
  directive @key(fields: String!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
  directive @lookup on FIELD_DEFINITION
  directive @is(field: String!) on ARGUMENT_DEFINITION

  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])
    @link(
      url: "https://graphql.github.io/graphql-federation-spec/draft"
      import: ["@lookup", "@is"]
    )

  type Query {
    review(id: ID!): Review
    product(id: ID! @is(field: "id")): Product @lookup
  }

  type Review {
    id: ID!
    body: String!
    product: Product!
    author: User!
  }

  type Product @key(fields: "id") {
    id: ID!
    reviews: [Review!]!
  }

  type User @key(fields: "id") {
    id: ID!
  }
`;

async function main() {
  const schema = await buildSubgraphSchema(typeDefs, {
    skipTransports: true,
    resolvers: {
      Query: {
        review: (_: unknown, { id }: { id: string }) => {
          const row = reviewsById[id];
          return row
            ? {
                id: row.id,
                body: row.body,
                product: { id: row.productId },
                author: { id: row.authorId },
              }
            : null;
        },
        product: (_: unknown, { id }: { id: string }) => ({
          id,
          reviews: (reviewsByProduct[id] || []).map(row => ({
            id: row.id,
            body: row.body,
            product: { id: row.productId },
            author: { id: row.authorId },
          })),
        }),
      },
      Product: {
        reviews: (parent: { id: string; reviews?: unknown[] }) =>
          parent.reviews ||
          (reviewsByProduct[parent.id] || []).map(row => ({
            id: row.id,
            body: row.body,
            product: { id: row.productId },
            author: { id: row.authorId },
          })),
      },
      Review: {
        product: (parent: { product: { id: string } }) => parent.product,
        author: (parent: { author: { id: string } }) => parent.author,
      },
    },
  });

  const yoga = createYoga({ schema, logging: false, graphqlEndpoint: '/graphql' });
  createServer((req, res) => {
    if (hits.maybeServe(req, res)) return;
    return yoga(req, res);
  }).listen(port, '127.0.0.1', () => {
    console.log(`reviews (@lookup/@is Mesh) at http://127.0.0.1:${port}/graphql`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
