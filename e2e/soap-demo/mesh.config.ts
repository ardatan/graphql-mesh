import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSOAPSubgraph } from '@omnigraph/soap';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSOAPSubgraph('soap-demo', {
        source: './SOAP.Demo.cls.wsdl',
        endpoint: `http://0.0.0.0:${args.getServicePort('soap-demo')}/csp/samples/SOAP.Demo.cls`,
      }),
    },
  ],
});
