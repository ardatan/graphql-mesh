import { inspect } from 'node:util';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = parse(/* GraphQL */ `
  extend type Product @key(fields: "upc") {
    upc: String! @external
    weight: Int @external
    price: Int @external
    inStock: Boolean
    shippingEstimate: Int @requires(fields: "price weight")
  }
`);

const resolvers = {
  Product: {
    __resolveReference(object) {
      return {
        ...object,
        ...inventory.find(product => product.upc === object.upc),
      };
    },
    shippingEstimate(object) {
      if (object.price == null || object.weight == null) {
        throw new Error(`${inspect(object)} doesn't have required fields; "price" and "weight".`);
      }
      // free for expensive items
      if (object.price > 1000) return 0;
      // estimate is based on weight
      return object.weight * 0.5;
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([
    {
      typeDefs,
      resolvers,
    },
  ]),
});

export const inventoryServer = () =>
  startStandaloneServer(server, { listen: { port: 9872 } }).then(({ url }) => {
    if (!process.env.CI) {
      console.log(`🚀 Server ready at ${url}`);
    }
    return server;
  });

const inventory = [
  { upc: '1', inStock: true },
  { upc: '2', inStock: false },
  { upc: '3', inStock: true },
];
