import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8'));

const resolvers = {
  Query: {
    featuredProduct() {
      return { id: 'p1', isFeatured: true };
    },
  },
  Product: {
    __resolveReference(object: { id: string }) {
      return {
        id: object.id,
        isFeatured: object.id === 'p1',
      };
    },
  },
};

export const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});
