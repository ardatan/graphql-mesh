---
"@graphql-mesh/plugin-snapshot": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule` for fs/path when reading/writing snapshots

#### Example
```ts
import useSnapshot from '@graphql-mesh/plugin-snapshot'

useSnapshot({
  ...meshPluginOptions,
  if: ['http://api.example.com/**'],
  outputDir: './snapshots',
})
```
