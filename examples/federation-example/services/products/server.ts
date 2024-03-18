import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = parse(/* GraphQL */ `
  extend type Query {
    topProducts(first: Int = 5): [Product]
  }

  type Product @key(fields: "upc") {
    upc: String!
    name: String
    price: Int
    weight: Int
  }
`);

const resolvers = {
  Product: {
    __resolveReference(object) {
      return {
        ...object,
        ...products.find(product => product.upc === object.upc),
      };
    },
  },
  Query: {
    topProducts(_, args) {
      return products.slice(0, args.first);
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

export const productsServer = () =>
  startStandaloneServer(server, { listen: { port: 9873 } }).then(({ url }) => {
    if (!process.env.CI) {
      console.log(`🚀 Server ready at ${url}`);
    }
    return server;
  });

const products = [
  {
    upc: '1',
    name: 'Table',
    price: 899,
    weight: 100,
  },
  {
    upc: '2',
    name: 'Couch',
    price: 1299,
    weight: 1000,
  },
  {
    upc: '3',
    name: 'Chair',
    price: 54,
    weight: 50,
  },
];
