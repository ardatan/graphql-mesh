const { ApolloServer, gql } = require('apollo-server');

const typeDefs = gql`
  type Query {
    me: User
    user(id: ID!): User
    users: [User]
  }

  type User {
    id: ID!
    name: String
    username: String
  }
`;

const resolvers = {
  Query: {
    me(root, args, context) {
      return context.users[0];
    },
    users(root, args, context) {
      return context.users;
    },
    user(root, args, context) {
      return context.users.find(user => user.id === args.id);
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: {
    users: [
      {
        id: '1',
        name: 'Ada Lovelace',
        birthDate: '1815-12-10',
        username: '@ada',
      },
      {
        id: '2',
        name: 'Alan Turing',
        birthDate: '1912-06-23',
        username: '@complete',
      },
    ],
  },
});

module.exports = server.listen({ port: 9871 }).then(({ url }) => {
  if (!process.env.CI) {
    console.log(`🚀 Server ready at ${url}`);
  }
  return server;
});
