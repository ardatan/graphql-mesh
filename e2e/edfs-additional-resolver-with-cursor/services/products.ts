import { createServer } from 'node:http';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';

const port = Opts(process.argv).getServicePort('products');

const products: Record<string, { id: string; name: string }> = {
  '1': { id: '1', name: 'Desk' },
};

createServer(
  createYoga({
    schema: buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          type Query {
            product(id: ID!): Product
          }

          type Product @key(fields: "id") {
            id: ID!
            name: String!
          }
        `),
        resolvers: {
          Query: {
            product: (_parent, { id }) => products[id] ?? null,
          },
          Product: {
            __resolveReference: (ref: { id: string }) =>
              products[ref.id] ?? { id: ref.id, name: `Product ${ref.id}` },
          },
        },
      },
    ]),
  }),
).listen(port, () => {
  console.log(`Products subgraph running on http://localhost:${port}/graphql`);
});
