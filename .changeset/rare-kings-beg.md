---
'@graphql-mesh/config': patch
'@graphql-mesh/odata': patch
'@graphql-mesh/http': patch
'json-machete': patch
'@omnigraph/json-schema': patch
'@omnigraph/openapi': patch
'@omnigraph/raml': patch
'@graphql-mesh/runtime': patch
---

Bump fetch and server packages and avoid using Response.redirect which needs a full path but instead Response with Location header works better
