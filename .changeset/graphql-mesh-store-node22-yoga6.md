---
"@graphql-mesh/store": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop `@graphql-mesh/cross-helpers`; resolve `fs` / `path` via `globalThis.process?.getBuiltinModule` at call sites

#### Example
```ts
// Before: import { fs, path } from '@graphql-mesh/cross-helpers'
const fs = globalThis.process?.getBuiltinModule?.('node:fs')
const path = globalThis.process?.getBuiltinModule?.('node:path')
await fs.promises.readFile(path.join(dir, 'store.json'), 'utf8')
```
