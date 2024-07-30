import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSQLiteSubgraph } from '@omnigraph/sqlite';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  output: args.get('output'),
  subgraphs: [
    {
      sourceHandler: loadSQLiteSubgraph('chinook', {
        db: 'chinook.db',
      }),
    },
  ],
});
