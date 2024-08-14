import { Opts } from '@e2e/opts';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import rest from '@graphql-mesh/transport-rest';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('greetings', {
        source: `http://0.0.0.0:${opts.getServicePort('greetings')}/openapi.json`,
        endpoint: `http://0.0.0.0:${opts.getServicePort('greetings')}`,
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  transports: {
    rest,
  },
});
