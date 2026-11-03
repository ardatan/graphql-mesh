---
"@graphql-mesh/utils": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Remove Mesh `Logger` / `DefaultLogger`, Mesh PubSub implementation, and `PubSub` / `MemPubSub` / `HivePubSub` re-exports
- Remove `handleMaybePromise` / `MaybePromise` / `mapMaybePromise` re-exports (use `@whatwg-node/promise-helpers`)
- Disposable helpers: keep `isDisposable` / `dispose` / `makeAsyncDisposable`; drop unused `createDisposable` / `createAsyncDisposable` / `makeDisposable`
- Node builtins via `globalThis.process?.getBuiltinModule?.('node:…')` instead of `@graphql-mesh/cross-helpers`
- `wrapFetchWithHooks` no longer accepts a default logger argument; onFetch `log` comes from `context.log` (fallback Hive `Logger`)

#### Example
```ts
import { wrapFetchWithHooks } from '@graphql-mesh/utils'
import { handleMaybePromise, fakePromise } from '@whatwg-node/promise-helpers'
import { Logger } from '@graphql-hive/logger'
import { MemPubSub } from '@graphql-hive/pubsub'

// Before: import { DefaultLogger, PubSub, handleMaybePromise } from '@graphql-mesh/utils'
// After: import logger/pubsub/promise helpers from their packages
const fetchFn = wrapFetchWithHooks(plugins)
// onFetch logging resolves from context.log.child('fetch') when Yoga/Gateway provides context.log
```
