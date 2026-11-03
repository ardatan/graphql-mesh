---
"@graphql-mesh/transform-extend": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule` when loading extend files

#### Example
```yaml
transforms:
  - extend:
      file: ./additional-type-defs.graphql
```
