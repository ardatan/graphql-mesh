---
'@graphql-tools/stitch': minor
'@graphql-tools/federation': minor
---

`stitchSchemas` stays generic: no `filterFederationInternals` / `join__Graph` auto-filter. Optional `onStitchedSchema` runs immediately before shared backbone root proxies install.

Federation `getStitchedSchemaFromSupergraphSdl` restores user `onStitchedSchema`. It filters via `filterInternalFieldsAndTypes` then runs the user hook (marking late root overrides as `localFields`) inside stitch `onStitchedSchema`, so proxies attach once to the public schema. External post-stitch `mapSchema` is unsupported — no proxy-stamped `ORIGINAL_RESOLVE` / retarget / WeakMap / `schema.extensions.backboneExecutor`. The backbone is one generic executor/proxy that plans against `info.schema` / `stitchingInfo`. `getBackboneExecutor(schema)` forces the bound schema (nested-gateway safe).

`filterInternalFieldsAndTypes` is exported from `@graphql-tools/stitch` (federation still re-exports it for compatibility).
