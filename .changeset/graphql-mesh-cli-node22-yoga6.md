---
"@graphql-mesh/cli": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, builtins, promise helpers).

## Motivation

Generated serve/SDK artifacts still assumed Mesh helpers and sometimes awaited `destroy()` on shutdown paths that should not block. Artifacts now follow AsyncDisposableStack + `fakePromise` like runtime.

## What changed ()

- Generated artifacts import `AsyncDisposableStack` and `fakePromise` / `fakeRejectPromise`
- Serve/polling shutdown may fire-and-forget `destroy()` where a hanging await was unnecessary
- Node builtins via `getBuiltinModule` at call sites (including generated templates)

## How to migrate

Rebuild CLI artifacts after upgrading `@graphql-mesh/cli` and update any forked templates.

#### Example
```ts
import { AsyncDisposableStack } from '@whatwg-node/disposablestack'
import { fakePromise } from '@whatwg-node/promise-helpers'

const disposables = new AsyncDisposableStack()
fakePromise(mesh.destroy())
```
