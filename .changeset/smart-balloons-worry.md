---
'@graphql-mesh/cli': minor
'@graphql-mesh/config': minor
'@graphql-mesh/json-schema': minor
'@graphql-mesh/mongoose': minor
'@graphql-mesh/mysql': minor
'@graphql-mesh/neo4j': minor
'@graphql-mesh/odata': minor
'@graphql-mesh/openapi': minor
'@graphql-mesh/raml': minor
'@graphql-mesh/tuql': minor
'json-machete': minor
'@omnigraph/json-schema': minor
'@omnigraph/openapi': minor
'@omnigraph/raml': minor
'@omnigraph/soap': minor
'@graphql-mesh/runtime': minor
'@graphql-mesh/types': minor
---

*BREAKING* - Neo4J handler's `url` changed to `endpoint` to be consistent with other handlers
*BREAKING* - Neo4J handler's `typeDefs` changed to `source` to be consistent with other handlers
*BREAKING* - OData handler's `url` changed to `endpoint` to be consistent with other handlers
*BREAKING* - OData handler's `metadata` changed to `source` to be consistent with other handlers
*BREAKING* - OpenAPI handler's `baseUrl` changed to `endpoint` to be consistent with other handlers
*BREAKING* - RAML handler's `baseUrl` changed to `endpoint` to be consistent with other handlers
*BREAKING* - RAML handler's `ramlFilePath` changed to `source` to be consistent with other handlers
