---
"@graphql-mesh/apollo-link": minor
"@graphql-mesh/cache-cfw-kv": minor
"@graphql-mesh/cache-file": minor
"@graphql-mesh/cache-inmemory-lru": minor
"@graphql-mesh/cache-localforage": minor
"@graphql-mesh/cache-redis": minor
"@graphql-mesh/cache-upstash-redis": minor
"@graphql-mesh/cli": minor
"@graphql-mesh/compose-cli": major
"@graphql-mesh/config": minor
"@graphql-mesh/fusion-composition": minor
"@graphql-mesh/graphql": minor
"@graphql-mesh/grpc": minor
"@graphql-mesh/http": minor
"@graphql-mesh/incontext-sdk-codegen": minor
"@graphql-mesh/json-schema": minor
"@graphql-mesh/merger-bare": minor
"@graphql-mesh/merger-stitching": minor
"@graphql-mesh/migrate-config-cli": major
"@graphql-mesh/mongoose": minor
"@graphql-mesh/mysql": minor
"@graphql-mesh/neo4j": minor
"@graphql-mesh/odata": minor
"@graphql-mesh/openapi": minor
"@graphql-mesh/plugin-deduplicate-request": minor
"@graphql-mesh/plugin-hive": minor
"@graphql-mesh/plugin-http-cache": minor
"@graphql-mesh/plugin-http-details-extensions": minor
"@graphql-mesh/plugin-jit": minor
"@graphql-mesh/plugin-live-query": minor
"@graphql-mesh/plugin-mock": minor
"@graphql-mesh/plugin-newrelic": minor
"@graphql-mesh/plugin-operation-field-permissions": minor
"@graphql-mesh/plugin-operation-headers": major
"@graphql-mesh/plugin-rate-limit": minor
"@graphql-mesh/plugin-response-cache": minor
"@graphql-mesh/plugin-snapshot": minor
"@graphql-mesh/plugin-statsd": minor
"@graphql-mesh/postgraphile": minor
"@graphql-mesh/raml": minor
"@graphql-mesh/runtime": minor
"@graphql-mesh/soap": minor
"@graphql-mesh/store": minor
"@graphql-mesh/string-interpolation": minor
"@graphql-mesh/supergraph": minor
"@graphql-mesh/thrift": minor
"@graphql-mesh/transform-cache": minor
"@graphql-mesh/transform-encapsulate": minor
"@graphql-mesh/transform-extend": minor
"@graphql-mesh/transform-federation": minor
"@graphql-mesh/transform-filter-schema": minor
"@graphql-mesh/transform-hive": minor
"@graphql-mesh/transform-hoist-field": minor
"@graphql-mesh/transform-naming-convention": minor
"@graphql-mesh/transform-prefix": minor
"@graphql-mesh/transform-prune": minor
"@graphql-mesh/transform-rate-limit": minor
"@graphql-mesh/transform-rename": minor
"@graphql-mesh/transform-replace-field": minor
"@graphql-mesh/transform-resolvers-composition": minor
"@graphql-mesh/transform-transfer-schema": minor
"@graphql-mesh/transform-type-merging": minor
"@graphql-mesh/transport-grpc": minor
"@graphql-mesh/transport-mysql": minor
"@graphql-mesh/transport-neo4j": minor
"@graphql-mesh/transport-odata": minor
"@graphql-mesh/transport-rest": minor
"@graphql-mesh/transport-soap": minor
"@graphql-mesh/transport-sqlite": minor
"@graphql-mesh/transport-thrift": minor
"@graphql-mesh/tuql": minor
"@graphql-mesh/types": minor
"@graphql-mesh/urql-exchange": minor
"@graphql-mesh/utils": minor
"@omnigraph/grpc": minor
"@omnigraph/json-schema": minor
"@omnigraph/mysql": minor
"@omnigraph/neo4j": minor
"@omnigraph/odata": minor
"@omnigraph/openapi": minor
"@omnigraph/raml": minor
"@omnigraph/soap": minor
"@omnigraph/sqlite": minor
"@omnigraph/thrift": minor
"json-machete": minor
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
