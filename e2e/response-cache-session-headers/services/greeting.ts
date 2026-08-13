import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);

createServer(
  createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          greeting: String!
        }
      `,
      resolvers: {
        Query: {
          greeting: () => 'hello',
        },
      },
    }),
  }),
).listen(opts.getServicePort('greeting'));
