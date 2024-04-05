import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Pets', {
        source: './swagger/pets.json',
        endpoint: `http://localhost:{context.headers['x-upstream-port']:4001}`,
      }),
    },
  ],
});
