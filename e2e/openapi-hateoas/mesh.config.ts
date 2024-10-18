import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Products', {
        source: './products.json'
      }),
    },
    {
      sourceHandler: loadOpenAPISubgraph('Suppliers', {
        source: './suppliers.json'
      }),
    },
  ],
  useHATEOAS: true,
});
