import { createServer } from 'node:http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const port = Opts(process.argv).getServicePort('Subgraph2');

createServer(
  createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type TargetType {
          id: String
        }

        type TargetQuery {
          targets: [TargetType]
        }

        type Query {
          targetQuery: TargetQuery
        }
      `,
      resolvers: {
        Query: {
          targetQuery: () => ({}),
        },
        TargetQuery: {
          targets: () => [{ id: 'nullish' }, { id: 'empty' }, { id: 'full' }],
        },
      },
    }),
  }),
).listen(port, () => {
  console.log(`Subgraph2 running on http://localhost:${port}/graphql`);
});
