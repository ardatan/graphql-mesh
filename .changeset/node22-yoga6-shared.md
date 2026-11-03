---
"@graphql-mesh/apollo-link": major
"@graphql-mesh/cache-cfw-kv": major
"@graphql-mesh/cache-file": major
"@graphql-mesh/cache-inmemory-lru": major
"@graphql-mesh/cache-localforage": major
"@graphql-mesh/cache-redis": major
"@graphql-mesh/cache-upstash-redis": major
"@graphql-mesh/cli": major
"@graphql-mesh/compose-cli": major
"@graphql-mesh/config": major
"@graphql-mesh/fusion-composition": major
"@graphql-mesh/graphql": major
"@graphql-mesh/grpc": major
"@graphql-mesh/http": major
"@graphql-mesh/incontext-sdk-codegen": major
"@graphql-mesh/json-schema": major
"@graphql-mesh/merger-bare": major
"@graphql-mesh/merger-stitching": major
"@graphql-mesh/migrate-config-cli": major
"@graphql-mesh/mongoose": major
"@graphql-mesh/mysql": major
"@graphql-mesh/neo4j": major
"@graphql-mesh/odata": major
"@graphql-mesh/openapi": major
"@graphql-mesh/plugin-deduplicate-request": major
"@graphql-mesh/plugin-hive": major
"@graphql-mesh/plugin-http-cache": major
"@graphql-mesh/plugin-http-details-extensions": major
"@graphql-mesh/plugin-jit": major
"@graphql-mesh/plugin-live-query": major
"@graphql-mesh/plugin-mock": major
"@graphql-mesh/plugin-newrelic": major
"@graphql-mesh/plugin-operation-field-permissions": major
"@graphql-mesh/plugin-operation-headers": major
"@graphql-mesh/plugin-rate-limit": major
"@graphql-mesh/plugin-response-cache": major
"@graphql-mesh/plugin-snapshot": major
"@graphql-mesh/plugin-statsd": major
"@graphql-mesh/postgraphile": major
"@graphql-mesh/raml": major
"@graphql-mesh/runtime": major
"@graphql-mesh/soap": major
"@graphql-mesh/store": major
"@graphql-mesh/string-interpolation": major
"@graphql-mesh/supergraph": major
"@graphql-mesh/thrift": major
"@graphql-mesh/transform-cache": major
"@graphql-mesh/transform-encapsulate": major
"@graphql-mesh/transform-extend": major
"@graphql-mesh/transform-federation": major
"@graphql-mesh/transform-filter-schema": major
"@graphql-mesh/transform-hive": major
"@graphql-mesh/transform-hoist-field": major
"@graphql-mesh/transform-naming-convention": major
"@graphql-mesh/transform-prefix": major
"@graphql-mesh/transform-prune": major
"@graphql-mesh/transform-rate-limit": major
"@graphql-mesh/transform-rename": major
"@graphql-mesh/transform-replace-field": major
"@graphql-mesh/transform-resolvers-composition": major
"@graphql-mesh/transform-transfer-schema": major
"@graphql-mesh/transform-type-merging": major
"@graphql-mesh/transport-grpc": major
"@graphql-mesh/transport-mysql": major
"@graphql-mesh/transport-neo4j": major
"@graphql-mesh/transport-odata": major
"@graphql-mesh/transport-rest": major
"@graphql-mesh/transport-soap": major
"@graphql-mesh/transport-sqlite": major
"@graphql-mesh/transport-thrift": major
"@graphql-mesh/tuql": major
"@graphql-mesh/types": major
"@graphql-mesh/urql-exchange": major
"@graphql-mesh/utils": major
"@omnigraph/grpc": major
"@omnigraph/json-schema": major
"@omnigraph/mysql": major
"@omnigraph/neo4j": major
"@omnigraph/odata": major
"@omnigraph/openapi": major
"@omnigraph/raml": major
"@omnigraph/soap": major
"@omnigraph/sqlite": major
"@omnigraph/thrift": major
"json-machete": major
---

## Motivation

Mesh still had its own logging, pubsub, and teardown model next to Yoga 6 / Hive Gateway:

- Mesh `DefaultLogger` and Mesh PubSub / `HivePubSub` re-exports beside `@graphql-hive/logger` and `@graphql-hive/pubsub`
- Shutdown via `pubsub.publish('destroy')`, with handlers and caches subscribing to that topic (easy to miss, leaks pools/clients/timers)
- Node 18/20 engines and loose `graphql` peers that drift from Yoga 6 / GraphQL Tools

This major aligns Mesh with that shared platform in one release.

## Design decisions

1. **Node `>=22.18.0`**: matches current Yoga / Hive / WHATWG engines.
2. **GraphQL peer `^16 || ^17`**: what Yoga 6 and `@graphql-tools/utils` / `schema` / `merge` / `executor` support (not `*`).
3. **Request path prefers context**: use Yoga/Gateway `context.log` / `context.pubsub` when present. Constructor `log` / `pubsub` stay only where init-time wiring is required (for example live-query subscribe, New Relic agent missing).
4. **Teardown via Explicit Resource Management**: Mesh tore down with `destroy` pubsub. Now components implement `[DisposableSymbols]` and `getMesh` registers them with `disposables.use(...)`. Handler/transform/plugin/cache constructors never took a `disposables` option; that is unchanged.
5. **No Mesh re-exports** for Logger, PubSub, or promise helpers; import Hive/WHATWG packages directly.

## Shared platform changes ()

- **Node.js `>=22.18.0`** (18/20 dropped).
- **`graphql` peer `^16.0.0 || ^17.0.0`**.
- **Logging**: Mesh `Logger` / `DefaultLogger` removed. Use `@graphql-hive/logger`. Prefer `context.log` on the request path. Option fields renamed from `logger` to `log` where they remain.
- **PubSub**: Mesh PubSub re-exports removed. Use `@graphql-hive/pubsub`. The **`destroy` pubsub lifecycle event is removed**; tear down with the disposable stack / `mesh.destroy()` instead of `pubsub.publish('destroy')`.
- **Lifecycle**: `getMesh` owns an `AsyncDisposableStack` and calls `disposables.use(...)` on disposable cache/handler/transform/plugin/pubsub instances. the change is destroy-pubsub subscribers replaced by `[DisposableSymbols]`, not "stop injecting disposables into options" (those options did not exist ).
- **Promises**: `handleMaybePromise` / `fakePromise` / `fakeRejectPromise` / `Promise.withResolvers` from `@whatwg-node/promise-helpers` (no Mesh re-exports).

## Migration checklist

```bash
node -v # >= 22.18.0
yarn add graphql@^16 @graphql-hive/logger @graphql-hive/pubsub
yarn add @whatwg-node/promise-helpers @whatwg-node/disposablestack
```

```ts
import { Logger } from '@graphql-hive/logger'
import { MemPubSub } from '@graphql-hive/pubsub'
import { AsyncDisposableStack } from '@whatwg-node/disposablestack'
import { handleMaybePromise, fakePromise } from '@whatwg-node/promise-helpers'

// Before on before:
// import { DefaultLogger, PubSub, handleMaybePromise } from '@graphql-mesh/utils'
// await pubsub.publish('destroy', undefined)

const log = new Logger()
const pubsub = new MemPubSub()
await using disposables = new AsyncDisposableStack()
disposables.use(cache)
disposables.use(handler)
```

### Import map (common breakages)

| Before | After |
| --- | --- |
| `DefaultLogger` / Mesh `Logger` | `Logger` from `@graphql-hive/logger` |
| Mesh `PubSub` / `MemPubSub` / `HivePubSub` | `@graphql-hive/pubsub` |
| `handleMaybePromise` / `MaybePromise` from Mesh utils | `@whatwg-node/promise-helpers` |
| `pubsub.publish('destroy')` + destroy subscribers | `[DisposableSymbols]` + `disposables.use` / `mesh.destroy()` |
| cache ctor `pubsub` (destroy subscribe) | removed; dispose the cache instead |
| option field `logger` | `log` |

Package-specific breaks (filter globs, cache `pubsub`, http-cache logging, Hive/live-query options, OpenAPI `futureLinks`, disposable handlers/transports, ...) are in each package's `*-node22-yoga6.md`.
