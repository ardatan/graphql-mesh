---
"@graphql-mesh/runtime": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

`getMesh` historically signaled shutdown with `pubsub.publish('destroy')`. Anything that forgot to subscribe leaked pools, Redis clients, and timers. Runtime now **owns** an `AsyncDisposableStack`, registers every disposable it creates, and exposes the same async-dispose protocol Yoga/Gateway expect.

## What changed

- `destroy` / `deferDispose` dispose the owned `AsyncDisposableStack` (no `destroy` pubsub event)
- Handlers, transforms, plugins, cache, and pubsub are registered with `disposables.use(...)`
- Context typing uses Hive `log` / `pubsub`
- Mesh instance implements `[DisposableSymbols.asyncDispose]` directly

## How to migrate

1. Stop publishing or subscribing to `destroy` on Mesh pubsub.
2. Prefer `await mesh.destroy()` or `await using mesh = await getMesh(...)`.
3. If you construct caches/handlers yourself, either pass them through `getMesh` or call `disposables.use` yourself.

#### Example
```ts
import { getMesh } from '@graphql-mesh/runtime'
import { DisposableSymbols } from '@whatwg-node/disposablestack'

// Before: pubsub.publish('destroy') and hope subscribers run
const mesh = await getMesh({ sources, cache, pubsub, log, plugins })
await mesh.destroy()
// equivalent: await mesh[DisposableSymbols.asyncDispose]()
```
