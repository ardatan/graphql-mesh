import { createServer } from 'node:http';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';
import { NATSPubSub } from '@graphql-hive/pubsub/nats';
import { connect } from '@nats-io/transport-node';

const port = Opts(process.argv).getServicePort('products');

const products: Record<string, { id: string; name: string; price: number }> = {
  '1': { id: '1', name: 'Table', price: 899.0 },
  '2': { id: '2', name: 'Chair', price: 54.0 },
  '3': { id: '3', name: 'Couch', price: 1299.0 },
};

async function main() {
  const pubsub = new NATSPubSub(
    await connect({
      servers: [`nats://${process.env['NATS_HOST']}:${process.env['NATS_PORT']}`],
    }),
    {
      // we make sure to use the same prefix for all gateways to share the same channels and pubsub.
      // meaning, all gateways using this channel prefix will receive and publish to the same topics
      subjectPrefix: 'my-shared-gateways',
    },
  );

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
              price: Float!
              review: Review
            }

            type Review @key(fields: "id") {
              id: ID!
            }

            type Mutation {
              addProduct(id: ID!, name: String!, price: Float!): Product!
              updateProduct(id: ID!, name: String!, price: Float!): Product!
            }
          `),
          resolvers: {
            Query: {
              product: (_parent, { id }) => products[id] ?? null,
            },
            Product: {
              __resolveReference: (ref: { id: string }) => {
                const id = ref.id;
                return {
                  id,
                  name: `Resolved ${products[id]?.name ?? 'Product'}`,
                  price: products[id]?.price ?? 0,
                };
              },
              review: (product: { id: string }) => ({ id: product.id }),
            },
            Review: {
              __resolveReference: (ref: { id: string }) => ({ id: ref.id }),
            },
            Mutation: {
              addProduct: (_parent, { id, name, price }) => {
                const product = { id, name, price };
                products[id] = product;
                pubsub.publish('new_product', product);
                return product;
              },
              updateProduct: (_parent, { id, name, price }) => {
                const product = { id, name, price };
                products[id] = product;
                pubsub.publish('update_product', product);
                return product;
              },
            },
          },
        },
      ]),
    }),
  ).listen(port, () => {
    console.log(`Products subgraph running on http://localhost:${port}/graphql`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
