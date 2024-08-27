import { Opts } from '@e2e/opts';
import {
  createPruneTransform,
  defineConfig as defineComposeConfig,
} from '@graphql-mesh/compose-cli';
import { defineConfig as defineGatewayConfig } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Wiki', {
        source: './openapi.json',
        endpoint: 'http://localhost:' + opts.getServicePort('Wiki'),
      }),
      transforms: [createPruneTransform()],
    },
  ],
});
export const gatewayConfig = defineGatewayConfig({});
