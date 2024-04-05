import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('YouTrack', {
        source: '{env.YOUTRACK_SERVICE_URL}/api/openapi.json',
        endpoint: '{env.YOUTRACK_SERVICE_URL}/api',
        jsonApi: true,
        operationHeaders: {
          Authorization: 'Bearer {env.YOUTRACK_TOKEN}',
        },
      }),
    },
  ],
});
