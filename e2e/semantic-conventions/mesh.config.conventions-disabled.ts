import {
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

export const composeConfig = defineConfig({
  ignoreSemanticConventions: true,
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('books',
        {
          endpoint: 'http://localhost:4001/graphql',
          source: './schema.graphql',
        }
      ),
    },
  ],
});
