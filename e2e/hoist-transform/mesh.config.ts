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
      sourceHandler: loadGraphQLHTTPSubgraph('weather', {
        endpoint: `http://localhost:${opts.getServicePort('weather')}/graphql`,
      }),
      transforms: [
        createHoistFieldTransform({
          mapping: [
            {
              typeName: 'Weather',
              pathConfig: ['rain', 'chance'],
              newFieldName: 'chanceOfRain',
            },
          ],
        }),
      ],
    },
  ],
});
