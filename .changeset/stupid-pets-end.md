---
"@graphql-mesh/json-schema": minor
"@graphql-mesh/new-openapi": minor
"json-machete": minor
"@omnigraph/json-schema": minor
"@omnigraph/openapi": minor
"@graphql-mesh/types": minor
---

BREAKING CHANGE: Named types are no longer deduplicated automatically, so this might introduce new types on your side. Also the types with unknown content are always reflected as "JSON"/"Any" scalar type
