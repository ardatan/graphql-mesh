const { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLID, GraphQLList } = require('graphql');

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

const AuthorType = new GraphQLObjectType({
  name: 'Author',
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

module.exports = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      author: {
        type: AuthorType,
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
