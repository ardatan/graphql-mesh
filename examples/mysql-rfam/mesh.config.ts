import { readFileSync } from 'fs';
import { join } from 'path';
import type { MeshComposeCLIConfig } from '@graphql-mesh/compose-cli';
import type { MeshServeCLIConfig } from '@graphql-mesh/serve-cli';
import { loadMySQLSubgraph } from '@omnigraph/mysql';

export const composeConfig: MeshComposeCLIConfig = {
  subgraphs: [
    {
      sourceHandler: loadMySQLSubgraph('Rfam', {
        endpoint: 'mysql://rfamro@mysql-rfam-public.ebi.ac.uk:4497/Rfam',
      }),
    },
  ],
};

export const serveConfig: MeshServeCLIConfig = {
  graphiql: {
    defaultQuery: readFileSync(join(__dirname, './example-query.graphql'), 'utf8'),
  },
};
