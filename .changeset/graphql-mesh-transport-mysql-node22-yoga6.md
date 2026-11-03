---
"@graphql-mesh/transport-mysql": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule` for util
- MySQL executor exposes `[DisposableSymbols.asyncDispose]` directly for pool teardown

#### Example
```ts
import { getMySQLExecutor } from '@graphql-mesh/transport-mysql'

await using executor = getMySQLExecutor({ pool })
// asyncDispose ends the pool
```
