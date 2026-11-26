import { createServer } from 'node:http';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';

const port = Opts(process.argv).getServicePort('reviews');

const reviews: Record<string, { id: string; content: string; productId: string }> = {
  '1': { id: '1', content: 'Great desk!', productId: '1' },
  '2': { id: '2', content: 'Sturdy legs.', productId: '1' },
};

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
            content: String!
            product: Product!
          }

          type Product @key(fields: "id") {
            id: ID!
          }
        `),
        resolvers: {
          Query: {
            review: (_parent, { id }) => reviews[id] ?? null,
          },
          Review: {
            __resolveReference: (ref: { id: string }) =>
              reviews[ref.id] ?? {
                id: ref.id,
                content: `Review ${ref.id}`,
                productId: ref.id,
              },
            product: (review: { productId: string }) => ({
              id: review.productId,
            }),
          },
        },
      },
    ]),
  }),
).listen(port, () => {
  console.log(`Reviews subgraph running on http://localhost:${port}/graphql`);
});
