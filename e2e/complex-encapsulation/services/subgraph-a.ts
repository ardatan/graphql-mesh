import { createServer } from 'node:http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);
const port = opts.getServicePort('subgraph-a');

createServer(
  createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo(id: ID!): Foo
        }

        type Foo {
          id: ID!
        }
      `,
      resolvers: {
        Query: {
          foo: (_parent, args, _context, _info) => {
            return { id: args.id };
          },
        },
      },
    }),
  }),
).listen(port, () => {
  console.log(`Subgraph A service listening on http://localhost:${port}`);
});
