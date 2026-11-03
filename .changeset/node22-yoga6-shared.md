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

## Why this shared major?

GraphQL Mesh is aligning with **GraphQL Yoga 6**, current GraphQL Tools majors, Hive Logger/PubSub, and WHATWG disposable/promise helpers. Those stacks expect a modern Node runtime and a single logging/pubsub/lifecycle model. Shipping that as one coordinated major avoids half-upgraded graphs where Yoga 6 runs next to Mesh Logger or Node 18-only assumptions.

## Shared platform changes (all packages in this file)

- **Node.js `>=22.18.0`** — Node 18/20 are no longer supported. Upgrade your runtime (and Docker/CI images) before installing this major.
- **`graphql` peer `^16.0.0 || ^17.0.0`** — matches Yoga 6 and `@graphql-tools/utils` / `schema` / `merge` / `executor`. Drop GraphQL 15.
- **Logging** — prefer Yoga / Hive Gateway `context.log` (`@graphql-hive/logger`). Mesh `Logger` / `DefaultLogger` re-exports are gone.
- **PubSub** — use `@graphql-hive/pubsub` (`PubSub` / `MemPubSub`). Mesh PubSub / `HivePubSub` re-exports and the `destroy` pubsub lifecycle event are gone.
- **Lifecycle** — own an `AsyncDisposableStack` and register resources with `disposables.use(...)`. Components implement `[DisposableSymbols.dispose|asyncDispose]`; do **not** inject a disposables stack into handler/plugin/cache options.
- **Node builtins** — call `globalThis.process?.getBuiltinModule?.('node:…')` at the use site. `@graphql-mesh/cross-helpers` is removed.
- **Promises** — import `handleMaybePromise` / `fakePromise` / `fakeRejectPromise` from `@whatwg-node/promise-helpers`; prefer `Promise.withResolvers`.

#### Example (runtime upgrade checklist)

```bash
node -v   # must be >= 22.18.0
yarn add graphql@^16
yarn add @graphql-hive/logger @graphql-hive/pubsub @whatwg-node/promise-helpers @whatwg-node/disposablestack
```

```ts
import { Logger } from '@graphql-hive/logger'
import { MemPubSub } from '@graphql-hive/pubsub'
import { AsyncDisposableStack, DisposableSymbols } from '@whatwg-node/disposablestack'

// Before: Mesh DefaultLogger / HivePubSub / pubsub.publish('destroy')
const log = new Logger()
const pubsub = new MemPubSub()
const disposables = new AsyncDisposableStack()
disposables.use(cache)
disposables.use(pubsub)
await disposables.disposeAsync()
```

Package-specific migrations (filters, cache constructors, plugin options, OpenAPI `futureLinks`, etc.) are documented in each package's `*-node22-yoga6.md` changeset.
