import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadSOAPSubgraph } from '@omnigraph/soap';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
  target: args.get('target'),
  subgraphs: [
    {
      sourceHandler: loadSOAPSubgraph('soap-demo', {
        source: 'https://www.crcind.com/csp/samples/SOAP.Demo.cls?WSDL',
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  port: args.getPort(),
  fusiongraph: args.get('fusiongraph'),
});
