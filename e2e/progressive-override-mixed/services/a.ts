import { createServer } from 'http';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { Opts } from '@e2e/opts';

const port = Opts(process.argv).getServicePort('a');

const feed = [
  {
    id: 'a-1',
    createdAt: 'from-a:a-1',
  },
  {
    id: 'a-2',
    createdAt: 'from-a:a-2',
  },
  {
    id: 'a-3',
    createdAt: 'from-a:a-3',
  },
];

createServer(
  createYoga({
    schema: buildSubgraphSchema([
      {
        typeDefs: parse(/* GraphQL */ `
          type Query {
            feed: [Post]
            aFeed: [Post]
          }

          type Post @key(fields: "id") {
            id: ID!
            createdAt: String
          }
        `),
        resolvers: {
          Query: {
            feed() {
              return feed;
            },
            aFeed() {
              return feed;
            },
          },
          Post: {
            __resolveReference(post) {
              return {
                ...post,
                createdAt: `from-a:${post.id}`,
              };
            },
            createdAt(post) {
              return `from-a:${post.id}`;
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
          console.log(`[service-a] received query: ${params.query}`);
        },
      },
    ],
  }),
).listen({ port }, () => {
  // eslint-disable-next-line no-console
  console.log(`Service A running at http://localhost:${port}/graphql`);
});
