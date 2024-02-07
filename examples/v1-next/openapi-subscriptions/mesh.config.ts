import { MeshComposeCLIConfig } from '@graphql-mesh/compose-cli';
import { MeshServeCLIConfig, useWebhooks } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig: MeshComposeCLIConfig = {
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('OpenAPICallbackExample', {
        source: './openapi.yml',
        endpoint: 'http://localhost:4001',
      }),
    },
  ],
};

export const serveConfig: MeshServeCLIConfig = {
  plugins: ctx => [useWebhooks(ctx)],
};
