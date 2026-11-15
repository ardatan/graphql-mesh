import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';

const books = [
  { id: '0', title: 'Lorem Ipsum', authorId: '1' },
  { id: '1', title: 'Dolor Sit Amet', authorId: '0' },
];

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        book(id: ID!): Book
        books(ids: [ID]): [Book!]!
      }

      type Book {
        id: ID!
        title: String!
        authorId: ID!
        # Stub for type merging without Mesh additionalTypeDefs / @resolveTo.
        author: Author
      }

      type Author {
        id: ID!
      }
    `,
    resolvers: {
      Query: {
        book: (_, { id }) => books.find(book => book.id === id),
        books: (_, { ids }) =>
          ids ? ids.map((id: string) => books.find(book => book.id === id)) : books,
      },
      Book: {
        author: book => ({ id: book.authorId }),
      },
    },
  }),
});

const port = Opts(process.argv).getServicePort('books');

createServer(yoga).listen(port, () => {
  console.log(`Books at http://localhost:${port}/graphql`);
});
