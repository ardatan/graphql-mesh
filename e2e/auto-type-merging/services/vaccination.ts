import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Args } from '@e2e/args';

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
        pet_by_id: async (_root, args, _context, _info) => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return {
            id: args.id,
            vaccinated: Math.random() > 0.5,
          };
        },
      },
    },
  }),
});

const port = Args(process.argv).getServicePort('vaccination', true);

createServer(yoga).listen(port, () => {
  console.log(`Vaccination service listening on http://localhost:${port}`);
});
