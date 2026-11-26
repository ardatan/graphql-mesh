---
"@graphql-mesh/transport-connect": patch
"@graphql-mesh/transport-sql": patch
"@graphql-mesh/transport-protobuf": patch
---

GraphQL 17: install Federation `Query._entities` by rebuilding the Query type so fields are real `GraphQLField` instances (`toConfig`), instead of assigning plain objects into `getFields()`.
