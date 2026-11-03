---
"@graphql-mesh/cache-file": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule` for path/fs at call sites

#### Example
```ts
import FileCache from '@graphql-mesh/cache-file'
const cache = new FileCache({ path: './.mesh-cache' })
```
