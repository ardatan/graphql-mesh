import { Args } from '@e2e/args';
import {
  camelCase,
  createFilterTransform,
  createNamingConventionTransform,
  createPrefixTransform,
  defineConfig as defineComposeConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';
/**
 * The configuration to serve the supergraph
 */

import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const args = Args(process.argv);

/**
 * The configuration to build a supergraph
 */

export const composeConfig = defineComposeConfig({
  target: args.get('target'),
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('petstore', {
        source: 'https://petstore.swagger.io/v2/swagger.json',
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
  plugins: () => [
    // @ts-expect-error TODO: TPluginContext should not extend Record<string, unknown>
    useDeferStream(),
  ],
});
