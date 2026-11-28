import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';

export const typeDefs = parse(
  readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8'),
);

export const resolvers = {
  Product: {
    __resolveReference(object: any) {
      return {
        ...object,
        ...products.find((product) => product.upc === object.upc),
      };
    },
  },
  Query: {
    topProducts(_: any, args: any) {
      return products.slice(0, args.first);
    },
  },
};

export const schema = buildSubgraphSchema([
  {
    typeDefs,
    resolvers,
  },
]);

export const server = new ApolloServer({
  schema,
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
