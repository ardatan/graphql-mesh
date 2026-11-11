import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

/**
 * Plain GraphQL subgraph — Mesh `@merge` auto-type-merging is the point of this
 * e2e. Do not convert to a Federation subgraph: Apollo Router needs `_entities`
 * for entity fetches, which would bypass Mesh merge and change the test intent.
 * Execute coverage stays Hive-only for that reason.
 */
export const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      scalar BigInt

      type Query {
        pet_by_id(id: BigInt!): Pet
      }

      type Pet {
        id: BigInt!
        vaccinated: Boolean!
      }
    `,
    resolvers: {
      Query: {
        pet_by_id: (_root, args, _context, _info) => {
          return {
            id: args.id,
            vaccinated: false,
          };
        },
      },
    },
  }),
});

const port = Opts(process.argv).getServicePort('vaccination', true);

createServer(yoga).listen(port, () => {
  console.log(`Vaccination service listening on http://localhost:${port}`);
});
