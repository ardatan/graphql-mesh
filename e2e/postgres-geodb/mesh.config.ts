import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSqlSubgraph } from '@omnigraph/sql';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSqlSubgraph('Geo', {
        endpoint: `postgres://postgres:docker@localhost:${opts.getServicePort('geodb')}/postgres`,
      }),
    },
  ],
});
