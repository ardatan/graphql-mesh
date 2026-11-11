import { Opts } from '@e2e/opts';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);
const apiPort = opts.getServicePort('API');

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Billing', {
        source: './openapi.yaml',
        endpoint: `http://localhost:${apiPort}`,
      }),
    },
  ],
});
