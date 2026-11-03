---
"@graphql-mesh/utils": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Utils was a dumping ground for Mesh Logger, Mesh PubSub, and promise-helper re-exports. Consumers upgrading to Yoga 6 already depend on Hive/WHATWG packages; keeping Mesh copies caused duplicate types and a fake "default logger" path in fetch hooks.

## What changed in this package

- Remove Mesh `Logger` / `DefaultLogger`, Mesh PubSub implementation, and `PubSub` / `MemPubSub` / `HivePubSub` re-exports
- Remove `handleMaybePromise` / `MaybePromise` / `mapMaybePromise` re-exports — import from `@whatwg-node/promise-helpers`
- Keep `isDisposable` / `dispose` / `makeAsyncDisposable`; drop unused `createDisposable` / `createAsyncDisposable` / `makeDisposable`
- `wrapFetchWithHooks` no longer takes a default logger argument; `OnFetchHookPayload.log` resolves from `context.log` (with a Hive `Logger` fallback)

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
// onFetch payload.log === context.log.child('fetch') when Yoga/Gateway provides context.log
```
