import { Opts } from '@e2e/opts';
import {
  createEncapsulateTransform,
  createPrefixTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('subgraph-a', {
        endpoint: `http://localhost:${opts.getServicePort('subgraph-a')}/graphql`,
      }),
      transforms: [
        createEncapsulateTransform({
          name: 'SubgraphA',
          applyTo: {
            query: true,
            mutation: true,
            subscription: true,
          },
        }),
        createPrefixTransform({
          value: 'SubgraphA',
          includeRootOperations: false,
        }),
      ],
    },
  ],
});
