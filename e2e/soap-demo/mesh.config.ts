import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSOAPSubgraph } from '@omnigraph/soap';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  output: args.get('output'),
  subgraphs: [
    {
      sourceHandler: loadSOAPSubgraph('soap-demo', {
        source: 'https://www.crcind.com/csp/samples/SOAP.Demo.cls?WSDL',
      }),
    },
  ],
});
