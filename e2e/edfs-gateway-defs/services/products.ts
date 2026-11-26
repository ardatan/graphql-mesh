import { createServer } from 'node:http';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';
import { NATSPubSub } from '@graphql-hive/pubsub/nats';
import { connect } from '@nats-io/transport-node';

const port = Opts(process.argv).getServicePort('products');

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
              hello: String!
            }
            type Product @key(fields: "id") {
              id: ID!
              name: String!
              price: Float!
            }

            type Mutation {
              createProduct(name: String!, price: Float!): Product!
            }
          `),
          resolvers: {
            Query: {
              hello: () => 'world',
            },
            Product: {
              __resolveReference: ref => ({
                id: ref.id,
                name: `Roomba X${ref.id}`,
                price: 100,
              }),
            },
            Mutation: {
              createProduct: (_parent, { name, price }) => {
                const product = {
                  id: String(Math.floor(Math.random() * 1000)),
                  name,
                  price,
                };

                pubsub.publish('new_product', product);

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
