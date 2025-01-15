import { parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';
import { authors } from './data';

const opts = Opts(process.argv);
const port = opts.getServicePort('authors');

startStandaloneServer(
  new ApolloServer({
    schema: buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.1"
            import: ["@composeDirective", "@key"]
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

        type Author @key(fields: "id") @cacheControl(maxAge: 60) {
          id: ID!
          name: String!
        }

        type Query {
          authors: [Author]
          author(id: ID!): Author
        }
      `),
      resolvers: {
        Query: {
          authors: () => authors,
          author: (_, { id }) => authors.find(author => author.id === id),
        },
        Author: {
          __resolveReference: author => authors.find(a => a.id === author.id),
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
