import { Opts } from '@e2e/opts';
import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('loans', {
        endpoint: `http://localhost:${opts.getServicePort('loans')}/graphql`,
        source: './services/api.schema.graphql',
      }),
    },
  ],
});
