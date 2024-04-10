import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig, useWebhooks } from '@graphql-mesh/serve-cli';
import { PubSub } from '@graphql-mesh/utils';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
  target: args.get('target'),
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('OpenAPICallbackExample', {
        source: './services/api/openapi.yml',
        endpoint: `http://localhost:${args.getServicePort('api')}`,
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  port: args.getPort(),
  fusiongraph: args.get('fusiongraph'),
  pubsub: new PubSub(),
  plugins: ctx => [useWebhooks(ctx)],
});
