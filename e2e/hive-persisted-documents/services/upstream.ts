import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

createServer(
  createYoga<{}>({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
          bar: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'FOO',
          bar: () => 'BAR',
        },
      },
    }),
  }),
).listen(Opts(process.argv).getServicePort('upstream'), () => {
  console.log('Upstream service is running');
});
