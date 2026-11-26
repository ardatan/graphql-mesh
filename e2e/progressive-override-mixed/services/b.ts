import { createServer } from 'http';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';

const port = Opts(process.argv).getServicePort('b');

const feed = [
  {
    id: 'b-1',
    createdAt: 'from-b:b-1',
  },
  {
    id: 'b-2',
    createdAt: 'from-b:b-2',
  },
  {
    id: 'b-3',
    createdAt: 'from-b:b-3',
  },
];

createServer(
  createYoga({
    schema: buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          type Query {
            feed: [Post] @override(from: "a", label: "feed_in_b")
            bFeed: [Post]
          }

          type Post @key(fields: "id") {
            id: ID!
            createdAt: String @override(from: "a", label: "percent(75)")
          }

          extend schema
            @link(url: "https://specs.apollo.dev/federation/v2.7", import: ["@override", "@key"])
        `),
        resolvers: {
          Query: {
            feed() {
              return feed;
            },
            bFeed() {
              return feed;
            },
          },
          Post: {
            __resolveReference(post) {
              return {
                ...post,
                createdAt: `from-b:${post.id}`,
              };
            },
            createdAt(post) {
              return `from-b:${post.id}`;
            },
          },
        },
      },
    ]),
    plugins: [
      {
        onParams({ params }) {
          // Skip introspection query
          if (params.query?.includes('__ApolloGetServiceDefinition__')) {
            return;
          }
          console.log(`[service-b] received query: ${params.query}`);
        },
      },
    ],
  }),
).listen({ port }, () => {
  // eslint-disable-next-line no-console
  console.log(`Service B running at http://localhost:${port}/graphql`);
});
