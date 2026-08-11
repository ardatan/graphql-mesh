---
'@graphql-mesh/utils': minor
'@graphql-mesh/types': minor
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/config': patch
---

Batched `@resolveTo` joins can now match results to keys by a field on each result (`valueKeyField`), instead of assuming the upstream returns one row per key in request order. Use this for collection-style sources (Strapi filters, Hasura `where`, SQL `IN (...)`, and similar) that return rows in their own order, skip missing keys, or return multiple rows per key.

Example:

```graphql
extend type SearchResult {
  products: [Product!]!
    @resolveTo(
      sourceName: "Products"
      sourceTypeName: "Query"
      sourceFieldName: "productsBySkus"
      keyField: "sku"
      keysArg: "skus"
      valueKeyField: "sku"
    )
}
```

Docs: [Schema Extensions → Matching results by a field (`valueKeyField`)](https://the-guild.dev/graphql/mesh/v1/schema-extensions#matching-results-by-a-field-valuekeyfield)
