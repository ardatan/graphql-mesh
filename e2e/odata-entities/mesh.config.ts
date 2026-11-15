import { Opts } from '@e2e/opts';
import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli';
import { loadODataSubgraph } from '@omnigraph/odata';

const opts = Opts(process.argv);

/**
 * Live TripPin owns Airlines via `@key` + `@connect(entity: true)`.
 * Catalog is a local Federation GraphQL subgraph (`@apollo/subgraph`, same
 * pattern as e2e/federation-mixed) that stubs Airline + isFeatured.
 * Hive plans `_entities` against Trippin; Apollo Router uses entity:true.
 * No Mesh `@merge`.
 */
export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadODataSubgraph('Trippin', {
        endpoint: 'https://services.odata.org/TripPinRESTierService/(S(qzsyox3345c15qeq305pblvw))/',
        batch: 'multipart',
        expandNavProps: true,
        operationHeaders: {
          'User-Agent': 'GraphQL Mesh',
        },
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('catalog', {
        endpoint: `http://localhost:${opts.getServicePort('catalog')}/graphql`,
      }),
    },
  ],
});
