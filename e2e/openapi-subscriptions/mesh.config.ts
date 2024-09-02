import { Opts } from '@e2e/opts';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineGatewayConfig } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('OpenAPICallbackExample', {
        source: './services/api/openapi.yml',
        endpoint: `http://localhost:${opts.getServicePort('api')}`,
      }),
    },
  ],
});

export const gatewayConfig = defineGatewayConfig({
  webhooks: true,
});
