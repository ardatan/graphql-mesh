import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

/**
 * Plain GraphQL subgraph — Mesh `@merge` auto-type-merging is the point of this
 * e2e (Hive). Compose also dual-emits virtual `@connect(entity: true)` on
 * `petById` for Router entity planning (requestless `$args` mapping — not a
 * Yoga HTTP call). Do not convert to a Federation subgraph.
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
        """
        Upstream snake_case — naming-convention → isVaccinated (+ virtual $this rename).
        """
        is_vaccinated: Boolean!
      }
    `,
    resolvers: {
      Query: {
        pet_by_id: (_root, args, _context, _info) => {
          return {
            id: args.id,
            is_vaccinated: false,
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
