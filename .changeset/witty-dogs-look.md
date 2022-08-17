---
"@omnigraph/json-schema": minor
"@omnigraph/openapi": minor
"@graphql-mesh/new-openapi": minor
"@graphql-mesh/raml": minor
"@omnigraph/raml": minor
---

POSSIBLE BREAKING CHANGE:
Previously if the parameter name was not valid for GraphQL and sanitized like `product-tag` to `product_tag`, it was ignored. Now it has been fixed but this change might be a breaking change for you if the actual parameter schema is `integer` while it is represented as `string` today.
This also fixes an issue with ignored default values.
