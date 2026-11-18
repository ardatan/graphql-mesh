import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadSqlSubgraph } from '@omnigraph/sql';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadSqlSubgraph('Rfam', {
        endpoint: 'mysql://rfamro@mysql-rfam-public.ebi.ac.uk:4497/Rfam',
      }),
    },
  ],
});
