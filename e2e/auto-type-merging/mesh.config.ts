import { Args } from '@e2e/args';
import {
  camelCase,
  createFilterTransform,
  createNamingConventionTransform,
  createPrefixTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('petstore', {
        source: `http://0.0.0.0:${args.getServicePort('petstore')}/api/v3/openapi.json`,
        // endpoint must be manually specified because the openapi.json spec doesn't contain one
        endpoint: `http://0.0.0.0:${args.getServicePort('petstore')}/api/v3`,
      }),
      transforms: [
        createFilterTransform({
          rootFieldFilter: (typeName, fieldName) =>
            typeName === 'Query' && fieldName === 'getPetById',
        }),
      ],
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('vaccination', {
        endpoint: `http://0.0.0.0:${args.getServicePort('vaccination')}/graphql`,
      }),
      transforms: [
        createPrefixTransform({
          includeTypes: false,
          includeRootOperations: true,
          value: 'Vaccination_',
        }),
        createNamingConventionTransform({
          fieldNames: camelCase,
        }),
      ],
    },
  ],
});
