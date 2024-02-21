import { join } from 'path';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSQLiteSubgraph } from '@omnigraph/sqlite';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSQLiteSubgraph('chinook', {
        db: join(__dirname, 'chinook.db'),
      }),
    },
  ],
});
