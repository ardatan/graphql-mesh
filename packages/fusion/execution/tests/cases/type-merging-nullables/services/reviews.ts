import { GraphQLError } from 'graphql';
import { createSchema } from 'graphql-yoga';

// data fixtures
const reviews = [{ id: '1', productUpc: '1', userId: '1', body: 'love it' }];

export const reviewsSchema = createSchema({
  typeDefs: /* GraphQL */ `
    type Review {
      id: ID!
      body: String!
      product: Product
      user: User
    }

    type User {
      id: ID!
      reviews: [Review]!
    }

    type Product {
      upc: ID!
      reviews: [Review]
    }

    type Query {
      reviews(ids: [ID!]!): [Review]!
      _users(ids: [ID!]!): [User]!
      _products(upcs: [ID!]!): [Product]!
    }
  `,
  resolvers: {
    Query: {
      reviews: (_root, { ids }) =>
        ids.map(
          (id: string) =>
            reviews.find(r => r.id === id) ||
            new GraphQLError('Record not found', {
              extensions: {
                code: 'NOT_FOUND',
              },
            }),
        ),

      // Users will _always_ return a stub record,
      // regardless of whether there's a local representation of the user.
      // We're trusting that remote services are sending in valid User IDs...
      // Returning a stub record is necessary to fulfill the schema nullability requirement:
      // type User {
      //   reviews: [Review]!
      // }
      _users: (_root, { ids }) => ids.map((id: string) => ({ id })),

      // Products will only build a stub record when there's a local record of it,
      // otherwise, returning null without an error.
      // This allows the reviews service to have no opinions about unknown products;
      // it will neither confirm nor deny that they exist.
      // Returning null is permitted by the schema nullability spec:
      // type Product {
      //   reviews: [Review]
      // }
      _products: (_root, { upcs }) =>
        upcs.map((upc: string) => (reviews.find(r => r.productUpc === upc) ? { upc } : null)),
    },
    Review: {
      product: review => ({ upc: review.productUpc }),
      user: review => ({ id: review.userId }),
    },
    User: {
      reviews: user => reviews.filter(r => r.userId === user.id),
    },
    Product: {
      reviews: product => reviews.filter(r => r.productUpc === product.upc),
    },
  },
});
