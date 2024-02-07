import { join } from 'path';
import { MeshComposeCLIConfig } from '@graphql-mesh/compose-cli';
import { loadSQLiteSubgraph } from '@omnigraph/sqlite';

export const composeConfig: MeshComposeCLIConfig = {
  subgraphs: [
    {
      sourceHandler: loadSQLiteSubgraph('chinook', {
        db: join(__dirname, 'chinook.db'),
      }),
    },
  ],
};
