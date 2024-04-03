import { createServer } from 'http';
import { createSchema, createYoga } from 'graphql-yoga';
import { Args } from '../../args';

const books = [
  {
    id: '0',
    title: 'Lorem Ipsum',
    authorId: '1',
  },
  {
    id: '1',
    title: 'Dolor Sit Amet',
    authorId: '0',
  },
];

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        authorWithBooks(id: ID!): AuthorWithBooks
        book(id: ID!): Book
        books(ids: [ID]): [Book!]!
      }

      type AuthorWithBooks {
        id: ID!
        books: [Book!]!
      }

      type Book {
        id: ID!
        title: String!
        authorId: ID!
      }
    `,
    resolvers: {
      Query: {
        authorWithBooks: (_, { id }) => ({ id }),
        book: (_, { id }) => books.find(book => book.id === id),
        books: (_, { ids }) =>
          ids ? ids.map((id: string) => books.find(book => book.id === id)) : books,
      },
      AuthorWithBooks: {
        books: ({ id }) => books.filter(book => book.authorId === id),
      },
    },
  }),
});

const port = Args(process.argv).getSubgraphPort('books', true);

createServer(yoga).listen(port, () => {
  console.log(`Books service listening on http://localhost:${port}`);
});
