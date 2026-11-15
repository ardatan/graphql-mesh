---
'@graphql-mesh/fusion-composition': minor
---

When Mesh emits `@merge` for GraphQL auto type-merging (semantic conventions or federation `resolveReference`), also emit a virtual `@connect(entity: true)` for Apollo Router. Hive keeps `@merge` / `@meshSource`. Virtual-only connect does not flip the subgraph to rest transport; Mesh `@source` is aliased to `@meshSource` when a connect `@link` is present.
