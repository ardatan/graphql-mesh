import { Opts } from '@e2e/opts';
import {
  createHoistFieldTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('users', {
        endpoint: `http://localhost:${opts.getServicePort('users')}/graphql`,
      }),
      transforms: [
        createHoistFieldTransform({
          mapping: [
            {
              typeName: 'Query',
              pathConfig: ['users', 'results'],
              newFieldName: 'users',
            },
          ],
        }),
      ],
    },
  ],
});
