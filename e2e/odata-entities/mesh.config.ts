import { Opts } from '@e2e/opts';
import {
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';
import { loadODataSubgraph } from '@omnigraph/odata';

const opts = Opts(process.argv);

/**
 * OData Airlines owns resolvable `@key` + `@connect(entity: true)`.
 * Catalog is a Federation GraphQL subgraph that stubs Airline + isFeatured.
 * Hive plans `_entities` against Trippin; transport-rest repairs the bare
 * Federation-extracted `_entities` field. Apollo Router uses entity:true.
 * No Mesh `@merge`.
 */
export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadODataSubgraph('Trippin', {
        source: './fixtures/metadata.xml',
        endpoint: `http://127.0.0.1:${opts.getServicePort('OData')}`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('catalog', {
        endpoint: `http://localhost:${opts.getServicePort('catalog')}/graphql`,
      }),
    },
  ],
});
