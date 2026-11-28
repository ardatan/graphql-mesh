---
'@graphql-tools/stitch': minor
'@graphql-tools/federation': minor
---

**Breaking:** `onStitchedSchema` is removed from `getStitchedSchemaFromSupergraphSdl`. Apply gateway resolvers / schema tweaks via `onStitchingOptions` (typed to allow `resolvers` / `typeDefs`) instead of post-hoc mutation after the backbone is installed.

`filterInternalFieldsAndTypes` runs inside `stitchSchemas` **before** shared backbone root proxies when `filterFederationInternals: true` or the schema has `join__Graph` (federation sets the option). Plain stitch callers are not filtered. The backbone is one generic executor/proxy that plans against `info.schema` / `stitchingInfo`. `getBackboneExecutor(schema)` always forces the bound schema (nested-gateway safe). `ORIGINAL_RESOLVE` is stamped on the proxy fn so a later `mapSchema`/`toConfig` that drops field-config symbols still lets Islands call locals. No retarget / WeakMap / `schema.extensions.backboneExecutor`.

`filterInternalFieldsAndTypes` is exported from `@graphql-tools/stitch` (federation still re-exports it for compatibility).
