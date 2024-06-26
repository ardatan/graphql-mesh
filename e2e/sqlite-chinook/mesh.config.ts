import { resolve } from 'path';
import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadSQLiteSubgraph } from '@omnigraph/sqlite';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
  output: args.get('output'),
  subgraphs: [
    {
      sourceHandler: loadSQLiteSubgraph('chinook', {
        db: resolve(__dirname, 'chinook.db'),
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  port: args.getPort(),
  supergraph: args.get('supergraph'),
});
