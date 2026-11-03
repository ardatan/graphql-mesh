---
"@graphql-mesh/runtime": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

`getMesh` used to tear down via `pubsub.publish('destroy')`. That was easy to miss (subscribers optional) and did not match Yoga/Gateway Explicit Resource Management. Runtime now owns the disposable stack and is itself async-disposable.

## What changed in this package

- Own an `AsyncDisposableStack`; `destroy` / `deferDispose` dispose that stack instead of publishing `destroy`
- Register disposable handlers, transforms, plugins, cache, and pubsub with `disposables.use(...)`
- Context exposes Hive `log` / `pubsub` types
- Mesh instance exposes `[DisposableSymbols.asyncDispose]` directly (no `makeAsyncDisposable` wrapper)

#### Example
```ts
import { getMesh } from '@graphql-mesh/runtime'
import { DisposableSymbols } from '@whatwg-node/disposablestack'

const mesh = await getMesh({ sources, transforms, plugins, cache, pubsub, log })

// Before: rely on pubsub 'destroy' subscribers
await mesh.destroy()
// or: await mesh[DisposableSymbols.asyncDispose]()
```
