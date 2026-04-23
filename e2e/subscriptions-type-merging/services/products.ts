import { createServer } from 'node:http';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';

const port = Opts(process.argv).getServicePort('products');

createServer(
  createYoga({
    schema: buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        type Query {
          hello: String!
        }
        type Product @key(fields: "id") @key(fields: "name") {
          id: ID!
          name: String!
          price: Float!
          review: Review
        }
        type Review @key(fields: "id") {
          id: ID!
        }
      `),
      resolvers: {
        Query: {
          hello: () => 'world',
        },
        Product: {
          __resolveReference: ref => ({
            id: ref.id || 'noid',
            name: ref.name || `Roomba X${ref.id || 'noid'}`,
            price: 100,
          }),
          review: (product: { id: string }) => ({ id: product.id }),
        },
        Review: {
          __resolveReference: (ref: { id: string }) => ({ id: ref.id }),
        },
      },
    }),
  }),
).listen(port, () => {
  console.log(`Products subgraph running on http://localhost:${port}/graphql`);
});
