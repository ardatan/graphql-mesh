import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8'));

const resolvers = {
  Review: {
    author(review: any) {
      return { __typename: 'User', id: review.authorID };
    },
  },
  User: {
    reviews(user: any) {
      return reviews.filter(review => review.authorID === user.id);
    },
    numberOfReviews(user: any) {
      return reviews.filter(review => review.authorID === user.id).length;
    },
    username(user: any) {
      const found = usernames.find(username => username.id === user.id);
      return found ? found.username : null;
    },
  },
  Product: {
    reviews(product: any) {
      return reviews.filter(review => review.product.upc === product.upc);
    },
  },
};

export const server = new ApolloServer({
  schema: buildSubgraphSchema([
    {
      typeDefs,
      resolvers,
    },
  ]),
});

const usernames = [
  { id: '1', username: '@ada' },
  { id: '2', username: '@complete' },
];

const reviews = [
  {
    id: '1',
    authorID: '1',
    product: { upc: '1' },
    body: 'Love it!',
  },
  {
    id: '2',
    authorID: '1',
    product: { upc: '2' },
    body: 'Too expensive.',
  },
  {
    id: '3',
    authorID: '2',
    product: { upc: '3' },
    body: 'Could be better.',
  },
  {
    id: '4',
    authorID: '2',
    product: { upc: '1' },
    body: 'Prefer something else.',
  },
];
