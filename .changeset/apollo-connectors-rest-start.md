---
'@omnigraph/json-schema': major
'@omnigraph/openapi': major
'@omnigraph/raml': major
'@graphql-mesh/transport-rest': major
'@graphql-mesh/fusion-composition': major
---

REST subgraphs emit Apollo Connectors `connect/v0.4` (`@source` / `@connect`) instead of Mesh `@transport` / `@httpOperation`. `transport-rest` executes `@connect` for Hive Gateway (path/queryParams/selection, form-urlencoded bodies, Mesh interpolators including `|base64`, Hive qs options). Fusion composition skips Mesh `@transport` and stitching `@source` for Connectors subgraphs.
