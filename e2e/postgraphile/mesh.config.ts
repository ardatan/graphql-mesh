import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadPostgraphileSubgraph } from '@omnigraph/postgraphile';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadPostgraphileSubgraph('Library', {
        connectionString: `postgresql://postgres:password@localhost:${opts.getServicePort('postgres')}/library`,
      }),
    },
  ],
});
