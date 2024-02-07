import { createSchema, createYoga } from 'graphql-yoga';

const authors = [
  {
    id: '0',
    name: 'John Doe',
  },
  {
    id: '1',
    name: 'Jane Doe',
  },
];

export const authorsYoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        author(id: ID!): Author
        authors(ids: [ID]): [Author]
      }

      type Author {
        id: ID!
        name: String!
      }
    `,
    resolvers: {
      Query: {
        author: (_, { id }) => authors.find(author => author.id === id),
        authors: (_, { ids }) =>
          ids ? ids.map((id: string) => authors.find(author => author.id === id)) : authors,
      },
    },
  }),
});
