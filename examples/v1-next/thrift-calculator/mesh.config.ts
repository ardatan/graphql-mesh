import type { MeshComposeCLIConfig } from '@graphql-mesh/compose-cli';
import { loadThriftSubgraph } from '@omnigraph/thrift';

export const composeConfig: MeshComposeCLIConfig = {
  subgraphs: [
    {
      sourceHandler: loadThriftSubgraph('calculator', {
        source: './src/thrift/calculator.thrift',
        endpoint: 'http://localhost:9876/thrift',
        serviceName: 'Calculator',
      }),
    },
  ],
};
