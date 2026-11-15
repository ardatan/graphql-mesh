---
'@omnigraph/json-schema': minor
'@omnigraph/openapi': minor
'@omnigraph/raml': minor
'@graphql-mesh/transport-connector': minor
'@graphql-mesh/fusion-composition': minor
---

Breaking (0.x): REST subgraphs emit Federation Connectors `connect/v0.4` (`@source` / `@connect`) instead of Mesh `@transport` / `@httpOperation`. `transport-connector` executes `@connect` for Hive Gateway (path/queryParams/selection, form-urlencoded bodies, Mesh interpolators including `|base64`, Hive qs options). Fusion composition skips Mesh `@transport` and stitching `@source` for Connectors subgraphs.
