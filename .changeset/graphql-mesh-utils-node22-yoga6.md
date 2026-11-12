---
"@graphql-mesh/utils": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

utils re-exported Mesh Logger, Mesh PubSub, and promise helpers, and `wrapFetchWithHooks` accepted a default logger argument. That fought Yoga `context.log` and duplicated Hive/WHATWG packages.

## What changed ()

- Remove Mesh `Logger` / `DefaultLogger`, Mesh PubSub implementation, and PubSub re-exports
- Remove `handleMaybePromise` / `MaybePromise` / `mapMaybePromise` re-exports
- Keep `isDisposable` / `dispose` / `makeAsyncDisposable`; remove unused `createDisposable` / `createAsyncDisposable` / `makeDisposable`
- `wrapFetchWithHooks(hooks, instrumentation?)` no longer takes a default logger; payload `log` comes from `context.log` (Hive `Logger` fallback)

## How to migrate

1. Grep `@graphql-mesh/utils` for Logger/PubSub/handleMaybePromise and import Hive/WHATWG instead.
2. Drop the third argument from `wrapFetchWithHooks(...)`.
3. In custom `onFetch` hooks, prefer `context.log?.child(...)`.

#### Example
```ts
import { wrapFetchWithHooks } from '@graphql-mesh/utils'
import { handleMaybePromise, fakePromise } from '@whatwg-node/promise-helpers'
import { Logger } from '@graphql-hive/logger'
import { MemPubSub } from '@graphql-hive/pubsub'

// before: wrapFetchWithHooks(hooks, instrumentation, defaultLogger)
const fetchFn = wrapFetchWithHooks(hooks)
```
