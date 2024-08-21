import { readFileSync } from 'fs';
import { createServer } from 'http';
import { join } from 'path';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';

createServer(
  createYoga({
    schema: buildSubgraphSchema({
      typeDefs: parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf-8')),
      resolvers: {
        Query: {
          greetingsFromGraphQL: (_root, { name }) => `Hello, ${name}!`,
        },
      },
    }),
  }),
).listen(4001, () => {
  console.log('Server is running on http://localhost:4001');
});
