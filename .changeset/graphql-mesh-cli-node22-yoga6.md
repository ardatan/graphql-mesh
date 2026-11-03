---
"@graphql-mesh/cli": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Generated serve/SDK artifacts still assumed Mesh helpers and optional awaits around `destroy()`. Aligning artifacts with AsyncDisposableStack and fire-and-forget shutdown avoids hanging CLI processes and matches runtime teardown.

## What changed in this package

- Generated artifacts import `AsyncDisposableStack` and use `fakePromise` / `fakeRejectPromise`
- Polling / serve paths fire-and-forget `destroy()` without unnecessary `await`
- Node builtins via `globalThis.process?.getBuiltinModule` at call sites in CLI code and generated templates

#### Example
```ts
import { AsyncDisposableStack } from '@whatwg-node/disposablestack'
import { fakePromise } from '@whatwg-node/promise-helpers'

const disposables = new AsyncDisposableStack()
// generated serve shutdown:
fakePromise(mesh.destroy())
```
