---
'@graphql-mesh/cache-file': patch
'@graphql-mesh/cache-redis': patch
'@graphql-mesh/cache-upstash-redis': patch
'@graphql-mesh/cli': patch
'@graphql-mesh/config': patch
'@graphql-mesh/cross-helpers': minor
'@graphql-mesh/graphql': patch
'@graphql-mesh/http': patch
'@graphql-mesh/incontext-sdk-codegen': patch
'@graphql-mesh/json-schema': patch
'@graphql-mesh/plugin-hive': patch
'@graphql-mesh/plugin-live-query': patch
'@graphql-mesh/plugin-mock': patch
'@graphql-mesh/plugin-newrelic': patch
'@graphql-mesh/plugin-operation-field-permissions': patch
'@graphql-mesh/plugin-rate-limit': patch
'@graphql-mesh/plugin-response-cache': patch
'@graphql-mesh/plugin-snapshot': patch
'@graphql-mesh/postgraphile': patch
'@graphql-mesh/runtime': patch
'@graphql-mesh/soap': patch
'@graphql-mesh/store': patch
'@graphql-mesh/supergraph': patch
'@graphql-mesh/thrift': patch
'@graphql-mesh/transform-cache': patch
'@graphql-mesh/transform-extend': patch
'@graphql-mesh/transform-hive': patch
'@graphql-mesh/transform-rate-limit': patch
'@graphql-mesh/transport-grpc': patch
'@graphql-mesh/transport-mysql': patch
'@graphql-mesh/transport-neo4j': patch
'@graphql-mesh/transport-rest': patch
'@graphql-mesh/transport-soap': patch
'@graphql-mesh/utils': patch
'@omnigraph/grpc': patch
'@omnigraph/json-schema': patch
'@omnigraph/mysql': patch
'@omnigraph/odata': patch
'@omnigraph/openapi': patch
'@omnigraph/raml': patch
'@omnigraph/soap': patch
'@omnigraph/sqlite': patch
'@omnigraph/thrift': patch
---

Restore `@graphql-mesh/cross-helpers` and switch Node builtin access back from `process.getBuiltinModule` to the portable helpers (`fs`/`path`/`process`/`util`).

