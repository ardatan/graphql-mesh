import {
  createFederationTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('A', {
        endpoint: 'http://xxx',
        federation: false,
        source: './schemaA.graphql',
      }),
      transforms: [
        createFederationTransform({
          'Query.posts': {
            shareable: true, // doesn't work
          },
        }),
        createFederationTransform({
          'Post.id': {
            shareable: true, // works
          },
        }),
        createFederationTransform({
          'Post.date': {
            shareable: true, // works
          },
        }),
      ],
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('B', {
        endpoint: 'http://yyy',
        federation: false,
        source: './schemaB.graphql',
      }),
      transforms: [
        createFederationTransform({
          'Query.posts': {
            shareable: true,
          },
        }),
        createFederationTransform({
          'Post.id': {
            shareable: true,
          },
        }),
        createFederationTransform({
          'Post.date': {
            shareable: true,
          },
        }),
      ],
    },
  ],
});
