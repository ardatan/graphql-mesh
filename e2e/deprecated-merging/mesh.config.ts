import { Opts } from '@e2e/opts';
import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('subgraph-a', {
        endpoint: `http://localhost:${opts.getServicePort('subgraph-a')}/graphql`,
      }),
    },
  ],
});
