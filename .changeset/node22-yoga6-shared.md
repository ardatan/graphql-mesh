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

Mesh grew its own logging (`DefaultLogger`), pubsub (`HivePubSub` / Mesh PubSub), destroy-via-pubsub teardown, and `@graphql-mesh/cross-helpers` shims while the rest of the Guild stack converged on:

- **GraphQL Yoga 6** + Hive Gateway `context.log` / request-scoped diagnostics
- **`@graphql-hive/logger`** and **`@graphql-hive/pubsub`**
- **Explicit Resource Management** (`AsyncDisposableStack`, `[DisposableSymbols]`)
- **`@whatwg-node/promise-helpers`** and Node’s `process.getBuiltinModule`

Keeping Mesh-specific copies meant apps could “upgrade Yoga” and still import Mesh Logger, miss `destroy` subscribers, or crash on edge runtimes where `process` / Node builtins are absent. This major removes that dual stack in one coordinated release.

## Design decisions

1. **One platform floor (Node `>=22.18.0`)** — matches engines used by current Yoga / WHATWG / Hive packages and unlocks `getBuiltinModule` without polyfills.
2. **Context wins at request time** — `context.log` / `context.pubsub` from Yoga/Gateway beat plugin constructor options for per-operation work; optional `MeshPluginOptions.log` / `pubsub` remain only where init-time wiring is required (subscribe-once, agent missing, etc.).
3. **Disposables at the call site** — handlers/caches/plugins implement `[DisposableSymbols]` and `getMesh` / Gateway call `disposables.use(...)`. Injecting a stack into every options bag duplicated ownership and was easy to forget.
4. **No Mesh re-export tax** — promise helpers and Hive types come from their packages so TypeScript and bundlers see one source of truth.
5. **Safe non-Node access** — `globalThis.process?.…` and call-site `getBuiltinModule?.` so Cloudflare/edge entrypoints do not throw on import.

## Shared platform changes

- **Node.js `>=22.18.0`** — Node 18/20 unsupported. Upgrade runtime, Docker base images, and CI before installing.
- **`graphql` peer `^16.0.0 || ^17.0.0`** — aligned with Yoga 6 and `@graphql-tools/utils` / `schema` / `merge` / `executor`. GraphQL 15 is out.
- **Logging** — use `@graphql-hive/logger`. Prefer Yoga/Gateway `context.log` (and `.child(...)`) on the request path. Mesh `Logger` / `DefaultLogger` are removed.
- **PubSub** — use `@graphql-hive/pubsub` (`PubSub` / `MemPubSub`). Mesh PubSub re-exports and the **`destroy` pubsub lifecycle event** are removed; tear down with disposables instead of `pubsub.publish('destroy')`.
- **Lifecycle** — own an `AsyncDisposableStack`, register resources with `disposables.use(...)`. Components implement `[DisposableSymbols.dispose|asyncDispose]`. Do **not** pass `disposables` into handler/plugin/cache options.
- **Node builtins** — `globalThis.process?.getBuiltinModule?.('node:…')` at the **call site** (not module top-level). `@graphql-mesh/cross-helpers` is removed.
- **Promises** — `handleMaybePromise` / `fakePromise` / `fakeRejectPromise` / `Promise.withResolvers` from `@whatwg-node/promise-helpers` (no Mesh re-exports).

## Migration checklist

```bash
node -v  # >= 22.18.0
# replace Mesh logger/pubsub/promise imports
yarn add graphql@^16 @graphql-hive/logger @graphql-hive/pubsub
yarn add @whatwg-node/promise-helpers @whatwg-node/disposablestack
```

```ts
import { Logger } from '@graphql-hive/logger'
import { MemPubSub } from '@graphql-hive/pubsub'
import { AsyncDisposableStack } from '@whatwg-node/disposablestack'
import { handleMaybePromise, fakePromise } from '@whatwg-node/promise-helpers'

// Before:
// import { DefaultLogger, PubSub, handleMaybePromise } from '@graphql-mesh/utils'
// await pubsub.publish('destroy', undefined)

const log = new Logger()
const pubsub = new MemPubSub()
await using disposables = new AsyncDisposableStack()
disposables.use(cache)   // cache[DisposableSymbols.dispose|asyncDispose]
disposables.use(handler)
// leaving the `await using` scope disposes the stack
```

### Import map (common breakages)

| Before (`@graphql-mesh/utils` / types) | After |
| --- | --- |
| `DefaultLogger` / Mesh `Logger` | `@graphql-hive/logger` → `Logger` |
| `PubSub` / `MemPubSub` / `HivePubSub` | `@graphql-hive/pubsub` |
| `handleMaybePromise` / `MaybePromise` | `@whatwg-node/promise-helpers` |
| `pubsub.publish('destroy')` | `disposables.use(resource)` + dispose stack / `mesh.destroy()` |
| `import { fs, path } from '@graphql-mesh/cross-helpers'` | `globalThis.process?.getBuiltinModule?.('node:fs' \| 'node:path')` at use site |

Package-specific breaks (filter globs, cache `pubsub` options, HTTP-cache logging, Hive plugin options, OpenAPI `futureLinks`, disposable handlers/transports, …) live in each package’s `*-node22-yoga6.md` with **Why / What changed / Example**.
