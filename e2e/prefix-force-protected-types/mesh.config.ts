import { Opts } from '@e2e/opts';
import {
  createPrefixTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('Events', {
        endpoint: `http://localhost:${opts.getServicePort('events')}/graphql`,
      }),
      transforms: [
        createPrefixTransform({
          value: 'Events_',
          force: ['DateTime'],
        }),
      ],
    },
  ],
});
