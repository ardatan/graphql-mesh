import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';
import { books } from './data';

const opts = Opts(process.argv);
const port = opts.getServicePort('books');

startStandaloneServer(
  new ApolloServer({
    schema: buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.1"
            import: ["@composeDirective", "@key", "@external", "@extends"]
          )
          @link(
            url: "https://www.apollographql.com/docs/federation/v1/performance/caching/v1.0"
            import: ["@cacheControl"]
          )
          @composeDirective(name: "@cacheControl")

        enum CacheControlScope {
          PUBLIC
          PRIVATE
        }

        directive @cacheControl(
          maxAge: Int
          scope: CacheControlScope
          inheritMaxAge: Boolean
        ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

        type Book @key(fields: "id") @cacheControl(maxAge: 10) {
          id: ID!
          title: String!
          author: Author!
        }

        type Query {
          books: [Book]
          book(id: ID!): Book
        }

        type Author @key(fields: "id") @extends {
          id: ID! @external
          books: [Book]
        }
      `),
      resolvers: {
        Query: {
          books: () => books,
          book: (_, { id }) => books.find(book => book.id === id),
        },
        Book: {
          author: book => ({ __typename: 'Author', id: book.authorId }),
        },
        Author: {
          books: author => books.filter(book => book.authorId === author.id),
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
    ],
  }),
  { listen: { port } },
);
