/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */
import { readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLError, parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { resolvers } from './resolvers';

export const AUTH_HEADER = 'Bearer BOOKS_SECRET';

export const server = createYoga({
  schema: buildSubgraphSchema({
    typeDefs: parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf-8')),
    resolvers,
  }),
  plugins: [
    {
      onRequest({ request }) {
        if (request.url.includes('skip-auth')) {
          return;
        }
        const authHeader = request.headers.get('authorization');
        if (authHeader !== AUTH_HEADER) {
          throw new GraphQLError('Unauthorized', {
            extensions: {
              http: {
                status: 401,
              },
            },
          });
        }
      },
    },
  ],
});
