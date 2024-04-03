import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Args } from '../../args';

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

const yoga = createYoga({
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

const port = Args(process.argv).getSubgraphPort('authors', true);

createServer(yoga).listen(port, () => {
  console.log(`Authors service listening on http://localhost:${port}`);
});
