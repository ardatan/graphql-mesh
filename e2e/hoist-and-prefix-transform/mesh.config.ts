import { Opts } from '@e2e/opts';
import {
  createHoistFieldTransform,
  createPrefixTransform,
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
        createPrefixTransform({
          value: 'Test_',
        }),
        createHoistFieldTransform({
          mapping: [
            {
              typeName: 'Query',
              pathConfig: ['Test_users', 'results'],
              newFieldName: 'users',
            },
          ],
        }),
      ],
    },
  ],
});
