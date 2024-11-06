import { createRenameTransform, defineConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('wiki', {
        source: 'https://api.apis.guru/v2/specs/wikimedia.org/1.0.0/swagger.yaml',
        endpoint: 'https://wikimedia.org/api/rest_v1',
      }),
      transforms: [
        createRenameTransform({
          typeRenamer(opts) {
            if (opts.typeName == 'feed_availability_response') {
              return 'feed_availability_result';
            }
            return opts.typeName;
          },
        }),
      ],
    },
  ],
});
