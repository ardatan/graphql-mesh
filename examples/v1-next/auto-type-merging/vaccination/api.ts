import { createSchema, createYoga } from 'graphql-yoga';

export const vaccinationApi = createYoga({
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
        pet_by_id: async (root, args, context, info) => {
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
