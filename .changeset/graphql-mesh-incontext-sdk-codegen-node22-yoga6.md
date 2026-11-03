---
"@graphql-mesh/incontext-sdk-codegen": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule` for path when emitting SDK files

#### Example
```ts
// codegen path resolution no longer imports @graphql-mesh/cross-helpers
const path = globalThis.process?.getBuiltinModule?.('node:path')
path.join(outDir, 'sdk.ts')
```
