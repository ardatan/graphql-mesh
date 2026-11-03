---
"@graphql-mesh/cli": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Generated artifacts import `AsyncDisposableStack` and use `fakePromise` / `fakeRejectPromise`
- Polling / serve paths fire-and-forget `destroy()` without unnecessary `await`
- Node builtins via `globalThis.process?.getBuiltinModule` at call sites

#### Example
```ts
// Generated serve/SDK code now owns AsyncDisposableStack and tears down via destroy()
import { AsyncDisposableStack } from '@whatwg-node/disposablestack'
import { fakePromise } from '@whatwg-node/promise-helpers'

const disposables = new AsyncDisposableStack()
// ... register mesh resources ...
fakePromise(mesh.destroy()) // fire-and-forget on shutdown paths that previously awaited needlessly
```
