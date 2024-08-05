import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8'));

const resolvers = {
  Product: {
    __resolveReference(object: any) {
      return {
        ...object,
        ...products.find(product => product.upc === object.upc),
      };
    },
  },
  Query: {
    topProducts(_: any, args: any) {
      return products.slice(0, args.first);
    },
  },
};

export const server = new ApolloServer({
  schema: buildSubgraphSchema([
    {
      typeDefs,
      resolvers,
    },
  ]),
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
