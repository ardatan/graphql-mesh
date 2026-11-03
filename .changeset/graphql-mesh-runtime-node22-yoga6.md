---
"@graphql-mesh/runtime": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Own an `AsyncDisposableStack`; `destroy` / `deferDispose` dispose that stack instead of `pubsub.publish('destroy')`
- Register disposable handlers, transforms, plugins, cache, and pubsub with `disposables.use(...)`
- Context exposes Hive `log` / `pubsub` types
- Mesh instance exposes `[DisposableSymbols.asyncDispose]` directly (no `makeAsyncDisposable` wrapper)

#### Example
```ts
import { getMesh } from '@graphql-mesh/runtime'
import { DisposableSymbols } from '@whatwg-node/disposablestack'

const mesh = await getMesh({ /* sources, transforms, plugins, cache, pubsub */ })

// Before: await pubsub.publish('destroy', undefined) or mesh.destroy() only
// After: stack dispose cleans handlers/cache/pubsub registered via disposables.use
await mesh.destroy()
// or: await mesh[DisposableSymbols.asyncDispose]()
```
