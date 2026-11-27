---
"@graphql-mesh/transport-connect": patch
"@graphql-mesh/json-schema": patch
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
"@graphql-mesh/fusion-composition": patch
---

GraphQL 17 compatibility:

- Connect transport: wire `coerceOutputValue` / `coerceInputValue` for `@regexp` / `@length` / Date scalars; read `variableValues.coerced` for OData `$expand` options.
- JSON Schema / OpenAPI: coerce numeric enum defaults to enum keys and drop empty-string URL/email defaults so GraphQL 17 printing does not throw.
- Fusion naming-convention: rewrite enum arg `default.literal` instead of clearing it.
