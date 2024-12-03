import { Opts } from '@e2e/opts';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);

const servicePort = opts.getServicePort('OASService');

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Products', {
        source: './products.json',
        endpoint: 'http://localhost:' + servicePort,
        HATEOAS: true,
      }),
    },
    {
      sourceHandler: loadOpenAPISubgraph('Suppliers', {
        source: './suppliers.json',
        endpoint: 'http://localhost:' + servicePort,
        HATEOAS: true,
      }),
    },
  ],
});
