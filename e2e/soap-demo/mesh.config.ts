import { getLocalHostName, Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSOAPSubgraph } from '@omnigraph/soap';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSOAPSubgraph('soap-demo', {
        source: './SOAP.Demo.cls.wsdl',
        endpoint: `http://${getLocalHostName()}:${opts.getServicePort('soap-demo')}/csp/samples/SOAP.Demo.cls`,
      }),
    },
  ],
});
