import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadThriftSubgraph } from '@omnigraph/thrift';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  target: args.get('target'),
  subgraphs: [
    {
      sourceHandler: loadThriftSubgraph('calculator', {
        source: './services/calculator/calculator.thrift',
        endpoint: `http://0.0.0.0:${args.getServicePort('calculator', true)}/thrift`,
        serviceName: 'Calculator',
      }),
    },
  ],
});
