import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);
const servicePort = opts.getServicePort('auth');
export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('auth', {
        endpoint: `http://localhost:${servicePort}`,
        source: `http://localhost:${servicePort}/openapi.json`,
        operationHeaders: {
          Authorization: `Bearer {env.AUTH_TOKEN}`,
        },
      }),
    },
  ],
});
