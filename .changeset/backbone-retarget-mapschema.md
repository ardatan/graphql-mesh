---
'@graphql-tools/stitch': minor
'@graphql-tools/federation': minor
---

**Breaking:** `onStitchedSchema` is removed from `getStitchedSchemaFromSupergraphSdl`. Apply gateway resolvers / schema tweaks via `onStitchingOptions` or by stitching with additional `resolvers` / `typeDefs` instead of post-hoc mutation after the backbone is installed.

`filterInternalFieldsAndTypes` now runs inside `stitchSchemas` **before** shared backbone root proxies are installed, so there is no post-filter retarget or re-attach. The backbone is one generic executor/proxy that plans against `info.schema` / `stitchingInfo` (progressive-override labels/handler on `schema.extensions`). `getBackboneExecutor(schema)` derives a thin schema-bound wrapper without storing an Executor on the schema. `retargetBackboneToSchema`, per-schema WeakMap executor binding, and `schema.extensions.backboneExecutor` are gone.

`filterInternalFieldsAndTypes` is exported from `@graphql-tools/stitch` (federation still re-exports it for compatibility).
