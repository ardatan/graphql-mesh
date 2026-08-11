import { Opts } from '@e2e/opts';
import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('vendure', {
        endpoint: `http://localhost:${opts.getServicePort('vendure')}/graphql`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('strapi', {
        endpoint: `http://localhost:${opts.getServicePort('strapi')}/graphql`,
      }),
    },
  ],
  // Mirrors https://github.com/ardatan/graphql-mesh/issues/9607 — join shop search
  // results to CMS products by SKU via a collection-style filters.SKU.in batch query.
  additionalTypeDefs: /* GraphQL */ `
    extend type SearchResult {
      strapi_products: [Product!]!
        @resolveTo(
          sourceName: "strapi"
          sourceTypeName: "Query"
          sourceFieldName: "products"
          keyField: "sku"
          keysArg: "filters.SKU.in"
          valueKeyField: "SKU"
        )
    }
  `,
});
