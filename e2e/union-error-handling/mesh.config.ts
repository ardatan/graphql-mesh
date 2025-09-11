import { Opts } from '@e2e/opts';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);

const servicePort = opts.getServicePort('ErrorService');

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('ErrorAPI', {
        source: `http://localhost:${servicePort}/openapi.json`,
        endpoint: `http://localhost:${servicePort}`,
        ignoreErrorResponses: false,
      }),
    },
  ],
});
