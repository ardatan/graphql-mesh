import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import { parse } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';

export const typeDefs = parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'typeDefs.graphql'), 'utf8'),
);

export const resolvers = {
  Product: {
    __resolveReference(object: any) {
      return {
        ...object,
        ...inventory.find(product => product.upc === object.upc),
      };
    },
    shippingEstimate(object: any) {
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

export const schema = buildSubgraphSchema([
  {
    typeDefs,
    resolvers,
  },
]);

const inventory = [
  { upc: '1', inStock: true },
  { upc: '2', inStock: false },
  { upc: '3', inStock: true },
];
