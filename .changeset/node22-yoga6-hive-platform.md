---
"@graphql-mesh/types": major
"@graphql-mesh/utils": major
"@graphql-mesh/runtime": major
"@graphql-mesh/cli": major
"@graphql-mesh/config": major
"@graphql-mesh/http": major
"@graphql-mesh/store": major
"@graphql-mesh/cache-file": major
"@graphql-mesh/cache-inmemory-lru": major
"@graphql-mesh/cache-localforage": major
"@graphql-mesh/cache-redis": major
"@graphql-mesh/cache-upstash-redis": major
"@graphql-mesh/graphql": major
"@graphql-mesh/grpc": major
"@graphql-mesh/json-schema": major
"@graphql-mesh/mongoose": major
"@graphql-mesh/mysql": major
"@graphql-mesh/neo4j": major
"@graphql-mesh/odata": major
"@graphql-mesh/openapi": major
"@graphql-mesh/postgraphile": major
"@graphql-mesh/raml": major
"@graphql-mesh/soap": major
"@graphql-mesh/supergraph": major
"@graphql-mesh/thrift": major
"@graphql-mesh/transform-cache": major
"@graphql-mesh/transform-extend": major
"@graphql-mesh/transform-hive": major
"@graphql-mesh/transform-rate-limit": major
"@graphql-mesh/plugin-hive": major
"@graphql-mesh/plugin-live-query": major
"@graphql-mesh/plugin-mock": major
"@graphql-mesh/plugin-newrelic": major
"@graphql-mesh/plugin-operation-field-permissions": major
"@graphql-mesh/plugin-rate-limit": major
"@graphql-mesh/plugin-response-cache": major
"@graphql-mesh/plugin-snapshot": major
"@graphql-mesh/incontext-sdk-codegen": major
"@graphql-mesh/transport-grpc": major
"@graphql-mesh/transport-mysql": major
"@graphql-mesh/transport-neo4j": major
"@graphql-mesh/transport-rest": major
"@graphql-mesh/transport-soap": major
"@omnigraph/grpc": major
"@omnigraph/json-schema": major
"@omnigraph/mysql": major
"@omnigraph/odata": major
"@omnigraph/openapi": major
"@omnigraph/raml": major
"@omnigraph/soap": major
"@omnigraph/sqlite": major
"@omnigraph/thrift": major
---

Breaking changes for Node 22+, Yoga 6, and Hive platform alignment:

- Require Node.js `>=22.18.0` (Node 18/20 support dropped)
- Upgrade to Yoga 6 / GraphQL Tools / WHATWG majors
- Use `@graphql-hive/logger` directly (`.log` option/property); Mesh `Logger` / `DefaultLogger` types and re-exports removed
- Use `@graphql-hive/pubsub` (`PubSub` / `MemPubSub`) directly; Mesh `HivePubSub` alias and `PubSub` re-export from `@graphql-mesh/utils` removed; `destroy` pubsub event removed
- Mesh lifecycle cleanup now uses `AsyncDisposableStack` / `disposables` / `deferDispose` instead of `pubsub.publish('destroy')`
- Remove `@graphql-mesh/cross-helpers` — use global `process` and `process.getBuiltinModule('node:…')` for builtins
- Remove `handleMaybePromise` / `MaybePromise` / `mapMaybePromise` re-exports from `@graphql-mesh/utils` (import from `@whatwg-node/promise-helpers`)
- Replace `globby` usage with `matchFiles` where applicable
