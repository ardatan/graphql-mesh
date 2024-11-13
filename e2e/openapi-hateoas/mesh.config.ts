import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Products', {
        source: './products.json',
        endpoint: 'http://localhost:3000',
      }),
    },
    {
      sourceHandler: loadOpenAPISubgraph('Suppliers', {
        source: './suppliers.json',
        endpoint: 'http://localhost:3000',
      }),
    },
  ],
  useHATEOAS: true,
});
