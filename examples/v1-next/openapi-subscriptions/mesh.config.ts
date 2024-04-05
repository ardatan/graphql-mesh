import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig, useWebhooks } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('OpenAPICallbackExample', {
        source: './openapi.yml',
        endpoint: 'http://localhost:4001',
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  fusiongraph: 'fusiongraph.graphql',
  plugins: ctx => [useWebhooks(ctx)],
});
