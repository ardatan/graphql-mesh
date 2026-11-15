import { Opts } from '@e2e/opts';
import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);
const productsPort = opts.getServicePort('products');

/**
 * Spike: GraphQL Federation peer stubs Product; Connectors (OpenAPI emit
 * `@source` / `@connect(entity: true)` + JSONSelection) owns field fill.
 * Hive plans `_entities` against Products; Apollo Router uses entity:true.
 * No Mesh `@merge` / stitching `@source` on the Connectors owner.
 */
export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('Products', {
        source: './openapi.yaml',
        endpoint: `http://localhost:${productsPort}`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('catalog', {
        endpoint: `http://localhost:${opts.getServicePort('catalog')}/graphql`,
      }),
    },
  ],
});
