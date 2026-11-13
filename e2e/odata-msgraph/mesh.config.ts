import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadODataSubgraph } from '@omnigraph/odata';

/**
 * Microsoft Graph OData → Connectors (mirrors `examples/odata-microsoft`).
 * `$metadata` is public; live `me` needs `MSGRAPH_ACCESS_TOKEN` / `GRAPH_ACCESS_TOKEN`.
 */
export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadODataSubgraph('MicrosoftGraph', {
        endpoint: 'https://graph.microsoft.com/v1.0',
        batch: 'json',
        expandNavProps: true,
        operationHeaders: {
          Authorization: 'Bearer {env.MSGRAPH_ACCESS_TOKEN}',
        },
      }),
    },
  ],
});
