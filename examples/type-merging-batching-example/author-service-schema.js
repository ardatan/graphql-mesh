const { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLID, GraphQLList } = require('graphql');

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

const AuthorType = new GraphQLObjectType({
  name: 'Author',
  fields: {
    id: {
      type: GraphQLID,
    },
    name: {
      type: GraphQLString,
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
      authors: {
        type: new GraphQLList(AuthorType),
        args: {
          ids: {
            type: new GraphQLList(GraphQLID),
          },
        },
        resolve: (_, { ids }) => (ids ? ids.map(id => authors.find(author => author.id === id)) : authors),
      },
    },
  }),
});
