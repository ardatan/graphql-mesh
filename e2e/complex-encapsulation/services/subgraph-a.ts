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
          echoString(argument: String): String
          echoInt(argument: Int): Int
          echoBoolean(argument: Boolean): Boolean
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
          echoString: (_parent, args, _context, _info) => {
            return args.argument;
          },
          echoInt: (_parent, args, _context, _info) => {
            return args.argument;
          },
          echoBoolean: (_parent, args, _context, _info) => {
            return args.argument;
          },
        },
      },
    }),
  }),
).listen(port, () => {
  console.log(`Subgraph A service listening on http://localhost:${port}`);
});
