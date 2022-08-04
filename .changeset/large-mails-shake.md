---
"json-machete": patch
"@omnigraph/json-schema": patch
"@omnigraph/openapi": patch
"@graphql-mesh/utils": patch
---

- Respect `pattern` of `number` types
- Dereference first-level circular dependencies properly in `dereferenceObject`
- Do not make the schema single if there is one `allOf` or `anyOf` element but with properties
