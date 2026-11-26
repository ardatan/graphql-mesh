import { createServer } from 'node:http';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';

const port = Opts(process.argv).getServicePort('reviews');

createServer(
  createYoga({
    schema: buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          type Query {
            review(id: ID!): Review
          }

          type Review @key(fields: "id") {
            id: ID!
            content: String
            product: Product
          }

          type Product @key(fields: "id") {
            id: ID!
          }
        `),
        resolvers: {
          Query: {
            review: (_parent, { id }) => ({
              id,
              content: `Query review for the product with the id of ${id}`,
              productId: id,
            }),
          },
          Review: {
            __resolveReference: (ref: { id: string }) => ({
              id: ref.id,
              content: `Resolved review for the product with the id of ${ref.id}`,
              productId: ref.id,
            }),
            product: (review: { productId?: string; id: string }) => {
              const productId = review.productId ?? review.id;
              return productId ? { id: productId } : null;
            },
          },
          Product: {
            __resolveReference: (ref: { id: string }) => ({ id: ref.id }),
          },
        },
      },
    ]),
  }),
).listen(port, () => {
  console.log(`Reviews subgraph running on http://localhost:${port}/graphql`);
});
