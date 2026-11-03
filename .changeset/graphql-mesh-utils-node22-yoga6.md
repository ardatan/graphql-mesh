---
"@graphql-mesh/utils": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Utils re-exported Mesh Logger, Mesh PubSub, and WHATWG promise helpers, and `wrapFetchWithHooks` accepted a **default logger** argument so fetch hooks could log without Yoga context. After Yoga 6, that default path fought `context.log` (wrong logger identity, missing request children) and duplicated Hive/WHATWG packages in every consumer bundle.

## What changed

- Delete Mesh `Logger` / `DefaultLogger`, Mesh PubSub implementation, and `PubSub` / `MemPubSub` / `HivePubSub` re-exports
- Delete `handleMaybePromise` / `MaybePromise` / `mapMaybePromise` re-exports
- Keep `isDisposable` / `dispose` / `makeAsyncDisposable`; remove unused `createDisposable` / `createAsyncDisposable` / `makeDisposable`
- `wrapFetchWithHooks(hooks, instrumentation?)` — **no** default logger argument; payload `log` resolves from `context.log` (Hive `Logger` fallback)

## How to migrate

1. Grep for `@graphql-mesh/utils` imports of Logger/PubSub/handleMaybePromise and point them at Hive/WHATWG.
2. Remove the third argument from `wrapFetchWithHooks(...)`.
3. In custom `onFetch` hooks, prefer `context.log?.child(...)` (or the payload `log` getter, which already derives from context).

#### Example
```ts
import { wrapFetchWithHooks } from '@graphql-mesh/utils'
import { handleMaybePromise, fakePromise } from '@whatwg-node/promise-helpers'
import { Logger } from '@graphql-hive/logger'
import { MemPubSub } from '@graphql-hive/pubsub'

// Before:
// import { DefaultLogger, PubSub, handleMaybePromise } from '@graphql-mesh/utils'
// wrapFetchWithHooks(hooks, instrumentation, defaultLogger)

const fetchFn = wrapFetchWithHooks(hooks)
// OnFetchHookPayload.log ≈ context.log.child('fetch') when context.log exists
```
