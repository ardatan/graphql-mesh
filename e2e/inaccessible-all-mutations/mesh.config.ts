import { Opts } from '@e2e/opts';
import {
  createFilterTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('service-a', {
        endpoint: `http://localhost:${opts.getServicePort('service-a')}/graphql`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('service-b', {
        endpoint: `http://localhost:${opts.getServicePort('service-b')}/graphql`,
      }),
      transforms: [
        createFilterTransform({
          rootFieldFilter(typeName) {
            if (typeName === 'Mutation') {
              return false;
            }
            return true;
          },
        }),
      ],
    },
  ],
});
