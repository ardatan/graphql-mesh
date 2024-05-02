import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig, useWebhooks } from '@graphql-mesh/serve-cli';
import { PubSub } from '@graphql-mesh/utils';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
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
  fusiongraph: '', // TODO: dont require fusiongraph option since it can be provided from as a CLI arg
  pubsub: new PubSub(),
  plugins: ctx => [useWebhooks(ctx)],
});
