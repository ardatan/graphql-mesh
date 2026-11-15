import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8'));

const resolvers = {
  Query: {
    featuredAirline() {
      return { AirlineCode: 'AA', isFeatured: true };
    },
  },
  Airline: {
    __resolveReference(object: { AirlineCode: string }) {
      return {
        AirlineCode: object.AirlineCode,
        isFeatured: object.AirlineCode === 'AA',
      };
    },
  },
};

export const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});
