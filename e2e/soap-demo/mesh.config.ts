import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
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
