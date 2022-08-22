---
"@graphql-mesh/json-schema": minor
"@graphql-mesh/new-openapi": minor
"json-machete": minor
"@omnigraph/json-schema": minor
"@omnigraph/openapi": minor
---

## Some improvements on OAS handling
- If there are no parameters defined in OAS links, the handler exposes the arguments of the original operation.
- If the name of the link definition is not valid for GraphQL, the handler sanitizes it.

