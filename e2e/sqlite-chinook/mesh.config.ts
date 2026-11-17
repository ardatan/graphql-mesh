import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSqlSubgraph } from '@omnigraph/sql';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSqlSubgraph('chinook', {
        endpoint: 'file:chinook.db',
      }),
    },
  ],
});
