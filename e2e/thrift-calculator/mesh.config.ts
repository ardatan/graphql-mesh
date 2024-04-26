import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadThriftSubgraph } from '@omnigraph/thrift';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  output: args.get('output'),
  subgraphs: [
    {
      sourceHandler: loadThriftSubgraph('calculator', {
        source: './services/calculator/calculator.thrift',
        endpoint: `http://0.0.0.0:${args.getServicePort('calculator')}/thrift`,
        serviceName: 'Calculator',
      }),
    },
  ],
});
