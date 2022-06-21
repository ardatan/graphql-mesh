import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLSchema } from 'graphql';

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

const authors = [
  {
    id: '0',
  },
  {
    id: '1',
  },
];

const BookType = new GraphQLObjectType({
  name: 'Book',
  fields: {
    id: {
      type: GraphQLID,
    },
    title: {
      type: GraphQLString,
    },
    authorId: {
      type: GraphQLID,
    },
  },
});

const AuthorWithBooksType = new GraphQLObjectType({
  name: 'AuthorWithBooks',
  fields: {
    id: {
      type: GraphQLID,
    },
    books: {
      type: new GraphQLList(BookType),
      resolve: ({ id }) => books.filter(book => book.authorId === id),
    },
  },
});

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      authorWithBooks: {
        type: AuthorWithBooksType,
        args: {
          id: {
            type: GraphQLID,
          },
        },
        resolve: (_, { id }) => authors.find(author => author.id === id),
      },
      books: {
        type: new GraphQLList(BookType),
        resolve: () => books,
      },
      book: {
        type: BookType,
        args: {
          id: {
            type: GraphQLID,
          },
        },
        resolve: (_, { id }) => books.find(book => book.id === id),
      },
    },
  }),
});
