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
          emptyString(argument: String): String
          undefinedString(argument: String): String
          undefinedInt(argument: Int): Int
          zeroInt(argument: Int): Int
          falseBoolean(argument: Boolean): Boolean
          undefinedBoolean(argument: Boolean): Boolean
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
          ...Object.fromEntries(
            ['emptyString', 'undefinedString', 'undefinedInt', 'zeroInt', 'falseBoolean', 'undefinedBoolean'].map(
              field => [field, (_parent: unknown, args: Record<string, unknown>) => args.argument],
            ),
          ),
        },
      },
    }),
  }),
).listen(port, () => {
  console.log(`Subgraph A service listening on http://localhost:${port}`);
});
