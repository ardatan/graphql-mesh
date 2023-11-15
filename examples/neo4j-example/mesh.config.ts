import type { MeshComposeCLIConfig } from '@graphql-mesh/compose-cli';
import { loadNeo4JSubgraph } from '@omnigraph/neo4j';

export const composeConfig: MeshComposeCLIConfig = {
  subgraphs: [
    {
      sourceHandler: loadNeo4JSubgraph('Movies', {
        endpoint: 'neo4j+s://demo.neo4jlabs.com',
        auth: {
          type: 'basic',
          username: 'movies',
          password: 'movies',
        },
        database: 'movies',
      }),
    },
  ],
};
