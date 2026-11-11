---
'@omnigraph/json-schema': major
'@omnigraph/openapi': major
'@omnigraph/raml': major
'@graphql-mesh/transport-rest': major
---

REST subgraphs emit Apollo Connectors `connect/v0.4` (`@source` / `@connect`) instead of Mesh `@transport` / `@httpOperation`. `transport-rest` executes `@connect` for Hive Gateway.
