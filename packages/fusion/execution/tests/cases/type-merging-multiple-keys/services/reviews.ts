import { GraphQLError } from 'graphql';
import { createSchema } from 'graphql-yoga';

const reviews = [
  { id: '1', productId: '101', body: 'Love it!' },
  { id: '2', productId: '102', body: 'Too expensive.' },
  { id: '3', productId: '103', body: 'Could be better.' },
  { id: '4', productId: '101', body: 'Prefer something else.' },
];

export const reviewsSchema = createSchema({
  typeDefs: /* GraphQL */ `
    type Review {
      id: ID!
      body: String
      product: Product
    }

    type Product {
      id: ID!
      reviews: [Review]
    }

    type Query {
      review(id: ID!): Review
      productsByIds(ids: [ID!]!): [Product]!
    }
  `,
  resolvers: {
    Review: {
      product: review => ({ id: review.productId }),
    },
    Product: {
      reviews: product => reviews.filter(review => review.productId === product.id),
    },
    Query: {
      review: (_root, { id }) =>
        reviews.find(review => review.id === id) ||
        new GraphQLError('Record not found', {
          extensions: {
            code: 'NOT_FOUND',
          },
        }),
      productsByIds: (_root, { ids }) => ids.map((id: string) => ({ id })),
    },
  },
});
