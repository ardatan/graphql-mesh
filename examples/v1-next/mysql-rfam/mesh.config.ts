import { readFileSync } from 'fs';
import { join } from 'path';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadMySQLSubgraph } from '@omnigraph/mysql';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadMySQLSubgraph('Rfam', {
        endpoint: 'mysql://rfamro@mysql-rfam-public.ebi.ac.uk:4497/Rfam',
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  fusiongraph: './fusiongraph.graphql',
  graphiql: {
    defaultQuery: readFileSync(join(__dirname, './example-query.graphql'), 'utf8'),
  },
});
