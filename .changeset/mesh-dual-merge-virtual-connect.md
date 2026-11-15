---
'@graphql-mesh/fusion-composition': minor
---

Dual-annotate GraphQL entity transforms: keep Mesh `@merge` for Hive and also emit virtual `@connect(entity: true)` for Apollo Router. Virtual-only connect no longer flips the subgraph to rest transport; Mesh stitching `@source` is aliased to `@meshSource` when a connect `@link` is present so Router does not parse it as Apollo SCHEMA `@source`.
