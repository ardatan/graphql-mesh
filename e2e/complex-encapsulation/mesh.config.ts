import { Opts } from '@e2e/opts';
import {
  createEncapsulateTransform,
  createPrefixTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);
const subgraphAPort = opts.getServicePort('subgraph-a');
const subgraphBPort = opts.getServicePort('subgraph-b');

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('subgraph-a', {
        endpoint: `http://localhost:${subgraphAPort}/graphql`,
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
    {
      sourceHandler: loadOpenAPISubgraph('subgraph-b', {
        source: `http://localhost:${subgraphBPort}/openapi.json`,
        endpoint: `http://localhost:${subgraphBPort}`,
        operationHeaders: {
          'x-custom-header': '{args.xCustomHeader}',
        },
      }),
      transforms: [
        createEncapsulateTransform({
          name: 'SubgraphB',
          applyTo: {
            query: true,
            mutation: true,
            subscription: true,
          },
        }),
        createPrefixTransform({
          value: 'SubgraphB',
          includeRootOperations: false,
        }),
      ],
    },
  ],
});
