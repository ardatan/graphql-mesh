---
"@graphql-mesh/runtime": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

`getMesh` shut down with `pubsub.publish('destroy')` and expected handlers/caches to subscribe. That leaked when subscribers were missing. Runtime now owns an `AsyncDisposableStack`, registers disposable instances with `disposables.use(...)`, and exposes async dispose on the mesh instance.

## What changed ()

- `destroy` / `deferDispose` dispose the owned stack instead of publishing `destroy`
- Register disposable handlers, transforms, plugins, cache, and pubsub with `disposables.use(...)`
- Context typing uses Hive `log` / `pubsub`
- Mesh instance implements `[DisposableSymbols.asyncDispose]` directly

## How to migrate

1. Stop publishing or subscribing to `destroy` on Mesh pubsub.
2. Prefer `await mesh.destroy()` or `await using mesh = await getMesh(...)`.
3. Custom hosts that construct disposable caches/handlers outside `getMesh` should call `disposables.use` themselves.

#### Example
```ts
import { getMesh } from '@graphql-mesh/runtime'
import { DisposableSymbols } from '@whatwg-node/disposablestack'

// before: pubsub.publish('destroy') and hope subscribers run
const mesh = await getMesh({ sources, cache, pubsub, log, plugins })
await mesh.destroy()
```
