import { resolve } from 'path';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSQLiteSubgraph } from '@omnigraph/sqlite';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSQLiteSubgraph('chinook', {
        db: resolve(__dirname, 'chinook.db'),
      }),
    },
  ],
});
