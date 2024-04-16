import { Args } from '@e2e/args';
import {
  camelCase,
  createFilterTransform,
  createNamingConventionTransform,
  createPrefixTransform,
  defineConfig as defineComposeConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
  target: args.get('target'),
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

export const serveConfig = defineServeConfig({
  port: args.getPort(),
  fusiongraph: args.get('fusiongraph'),
  graphiql: {
    defaultQuery: /* GraphQL */ `
      query Test {
        getPetById(petId: 1) {
          __typename
          id
          name
          vaccinated
        }
      }
    `,
  },
});
