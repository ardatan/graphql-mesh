const { ApolloServer, gql } = require("apollo-server");

const typeDefs = gql`
  type Query {
    reviewById: Review
  }

  type Review {
    id: ID!
    body: String
    author: User
    product: Product
  }

  type User {
    id: ID!
    username: String
    numberOfReviews: Int
    reviews: [Review]
  }

  type Product {
    upc: ID!
    reviews: [Review]
  }
`;

const resolvers = {
  Query: {
    reviewById: (_,{ id }) => {
      return reviews.find(review => review.id === id);
    }
  },
  Review: {
    author(review) {
      return { __typename: "User", id: review.authorID };
    }
  },
  User: {
    reviews(user) {
      return reviews.filter(review => review.authorID === user.id);
    },
    numberOfReviews(user) {
      return reviews.filter(review => review.authorID === user.id).length;
    },
    username(user) {
      return usernames.find(username => username.id === user.id)?.username;
    }
  },
  Product: {
    reviews(product) {
      return reviews.filter(review => review.product.upc === product.upc);
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

module.exports = server.listen({ port: 9874 }).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
  return server;
});

const usernames = [
  { id: "1", username: "@ada" },
  { id: "2", username: "@complete" }
];
const reviews = [
  {
    id: "1",
    authorID: "1",
    product: { upc: "1" },
    body: "Love it!"
  },
  {
    id: "2",
    authorID: "1",
    product: { upc: "2" },
    body: "Too expensive."
  },
  {
    id: "3",
    authorID: "2",
    product: { upc: "3" },
    body: "Could be better."
  },
  {
    id: "4",
    authorID: "2",
    product: { upc: "1" },
    body: "Prefer something else."
  }
];
