import {
  camelCase,
  createFilterTransform,
  createNamingConventionTransform,
  createPrefixTransform,
  loadGraphQLHTTPSubgraph,
  MeshComposeCLIConfig,
} from '@graphql-mesh/compose-cli';
/**
 * The configuration to serve the supergraph
 */

import { MeshServeCLIConfig } from '@graphql-mesh/serve-cli';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

/**
 * The configuration to build a supergraph
 */

export const composeConfig: MeshComposeCLIConfig = {
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
        endpoint: 'http://localhost:4001/graphql',
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
};

export const serveConfig: MeshServeCLIConfig = {
  supergraph: './supergraph.graphql',
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
  plugins: ctx => [useDeferStream(ctx)],
};
