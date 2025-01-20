import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';
import { comments } from './data';

const opts = Opts(process.argv);
const port = opts.getServicePort('comments');

startStandaloneServer(
  new ApolloServer({
    schema: buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        type Book @key(fields: "id") @extends {
          id: ID! @external
          comments: [Comment]
        }

        type Comment @key(fields: "id") {
          id: ID!
          content: String!
          book: Book!
        }

        type Query {
          comments: [Comment]
        }
      `),
      resolvers: {
        Query: {
          comments: () => comments,
        },
        Book: {
          comments: book => comments.filter(comment => comment.bookId === book.id),
        },
        Comment: {
          book: comment => ({ __typename: 'Book', id: comment.bookId }),
        },
      },
    }),
    plugins: [
      {
        async requestDidStart({ request }) {
          if (request.operationName) {
            console.count(request.operationName);
          }
        },
      },
      ApolloServerPluginCacheControl({ defaultMaxAge: 5 }), // 5 seconds
    ],
  }),
  { listen: { port } },
);
