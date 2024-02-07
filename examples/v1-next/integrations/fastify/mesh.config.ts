import { MeshComposeCLIConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig: MeshComposeCLIConfig = {
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Pets', {
        source: './swagger/pets.json',
        endpoint: 'http://localhost:4001',
      }),
    },
  ],
};
