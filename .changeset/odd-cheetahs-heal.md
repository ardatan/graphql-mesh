---
"@graphql-mesh/config": minor
"@graphql-mesh/graphql": minor
"@graphql-mesh/json-schema": minor
"@graphql-mesh/neo4j": minor
"@graphql-mesh/odata": minor
"@graphql-mesh/openapi": minor
"@graphql-mesh/raml": minor
"@graphql-mesh/soap": minor
"@graphql-mesh/thrift": minor
"@omnigraph/json-schema": minor
"@graphql-mesh/utils": minor
---

## Improvements on outgoing HTTP calls

- Now Mesh's default fetch implementation deduplicates the same GET JSON requests in the same execution context
 - You should pass `Accept: application/json` to make this work.
- JSON Schema, new OpenAPI and RAML handlers now take GraphQL context as 3rd parameter. If you use `customFetch`, you can use that value to access Mesh internals such as the incoming `Request` object.

## HTTP Details in extensions for tracking HTTP calls

You can add `includeHttpDetailsInExtensions: true` to your configuration file to get more information about HTTP calls done by Mesh during the execution in `extensions` field of the response.

