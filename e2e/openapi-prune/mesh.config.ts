import { Opts } from '@e2e/opts';
import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import {
  createPruneTransform,
  defineConfig as defineComposeConfig,
} from '@graphql-mesh/compose-cli';
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
