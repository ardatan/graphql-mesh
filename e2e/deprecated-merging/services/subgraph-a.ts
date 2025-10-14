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
          rootField(
            deprecatedArg: DeprecatedArgEnum @deprecated(reason: "No longer needed")
            otherArg: Int
          ): RootFieldReturnType
        }

        enum DeprecatedArgEnum {
          VALUE1
          VALUE2
        }

        type RootFieldReturnType {
          id: ID!
        }
      `,
      resolvers: {
        Query: {
          rootField: (_parent, _args, _context, _info) => {
            return { id: 'root' };
          },
        },
      },
    }),
  }),
).listen(port, () => {
  console.log(`Subgraph A service listening on http://localhost:${port}`);
});
