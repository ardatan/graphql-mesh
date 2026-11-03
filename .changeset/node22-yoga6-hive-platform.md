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
"@graphql-mesh/plugin-http-cache": major
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

## Platform

- Require Node.js `>=22.18.0` (Node 18/20 dropped)
- Upgrade Yoga 6 / GraphQL Tools / WHATWG majors

## `@graphql-mesh/types`

- Remove Mesh `Logger` / `DefaultLogger` / `HivePubSub` exports; use `@graphql-hive/logger` and `@graphql-hive/pubsub` (`PubSub`) directly
- Add optional `disposables?: AsyncDisposableStack` on handler/transform/plugin/merger options and `GetMeshSourcePayload`
- Drop `destroy` pubsub hook typing

## `@graphql-mesh/utils`

- Remove Mesh PubSub implementation and `PubSub` / `MemPubSub` re-exports
- Remove `handleMaybePromise` / `MaybePromise` / `mapMaybePromise` re-exports (use `@whatwg-node/promise-helpers`)
- Prefer `fakePromise` / `fakeRejectPromise` in disposable helpers

## `@graphql-mesh/runtime` / `@graphql-mesh/config` / `@graphql-mesh/cli` / `@graphql-mesh/http`

- Create/share `AsyncDisposableStack`; `destroy` / `deferDispose` dispose that stack
- Generated artifacts import `AsyncDisposableStack` and `fakePromise` / `fakeRejectPromise`
- Serve/CLI use Hive `Logger` and Hive `MemPubSub`

## Handlers (`@graphql-mesh/grpc`, `mysql`, `mongoose`, `neo4j`, `postgraphile`, …)

- Cleanup via `makeAsyncDisposable(handler, …)` so `getMesh` can `disposables.use(handler)` instead of `pubsub.publish('destroy')`

## Transforms / plugins

- `@graphql-mesh/transform-rate-limit`: disposable via `makeDisposable` + `disposables.use(this)`
- `@graphql-mesh/transform-cache`: `Promise.withResolvers` for waiters; forward subscribe failures
- `@graphql-mesh/plugin-hive` / `plugin-live-query`: require context/`log` from Mesh/Gateway; no default `new Logger()`
- `@graphql-mesh/plugin-http-cache`: use `context.log` in `onFetch` (no plugin `log` option)

## Cross-helpers removed

- Delete `@graphql-mesh/cross-helpers` package
- Call sites use global `process` and `process.getBuiltinModule('node:…')` (no `node:` static imports)

## Caches / loaders / transports

- Import Hive `Logger` / `PubSub` from original packages; declare those dependencies where needed
- Redis/localforage/inmemory-lru disconnect via `DisposableSymbols` / shared disposables stack
