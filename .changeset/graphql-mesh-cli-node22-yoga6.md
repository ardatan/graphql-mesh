---
"@graphql-mesh/cli": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

CLI-generated serve/SDK code still assumed Mesh helpers and sometimes `await destroy()` on paths that should not block shutdown. Artifacts now follow the same AsyncDisposableStack + `fakePromise` patterns as runtime so generated servers exit cleanly under Node 22.

## What changed

- Generated artifacts import `AsyncDisposableStack` and `fakePromise` / `fakeRejectPromise`
- Serve/polling shutdown fire-and-forgets `destroy()` where a hanging await was unnecessary
- Node builtins loaded via `getBuiltinModule` at call sites (including generated templates)

## How to migrate

1. Rebuild CLI artifacts (`mesh build` / serve codegen) after upgrading `@graphql-mesh/cli`.
2. Diff generated `index.ts` / serve entry for AsyncDisposableStack usage and update any forks of those templates.

#### Example
```ts
import { AsyncDisposableStack } from '@whatwg-node/disposablestack'
import { fakePromise } from '@whatwg-node/promise-helpers'

const disposables = new AsyncDisposableStack()
fakePromise(mesh.destroy()) // shutdown path — do not block the event loop needlessly
```
