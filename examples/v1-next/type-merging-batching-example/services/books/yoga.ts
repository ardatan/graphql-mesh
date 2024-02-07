import { createSchema, createYoga } from 'graphql-yoga';

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

export const booksYoga = createYoga({
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
