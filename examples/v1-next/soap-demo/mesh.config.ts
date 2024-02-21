import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSOAPSubgraph } from '@omnigraph/soap';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSOAPSubgraph('soap-demo', {
        source: 'https://www.crcind.com/csp/samples/SOAP.Demo.cls?WSDL',
      }),
    },
  ],
});
