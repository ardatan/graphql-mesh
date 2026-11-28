---
'@graphql-tools/stitch': minor
'@graphql-tools/federation': minor
---

`stitchSchemas` stays generic: no `filterFederationInternals` / `join__Graph` auto-filter. Optional `beforeBackboneAttach` runs immediately before shared backbone root proxies install.

Federation `getStitchedSchemaFromSupergraphSdl` restores `onStitchedSchema`. It filters via `filterInternalFieldsAndTypes` then runs `onStitchedSchema` (marking late root overrides as `localFields`) inside `beforeBackboneAttach`, so proxies attach once to the public schema. No retarget / WeakMap / `schema.extensions.backboneExecutor`. The backbone is one generic executor/proxy that plans against `info.schema` / `stitchingInfo`. `getBackboneExecutor(schema)` forces the bound schema (nested-gateway safe). `ORIGINAL_RESOLVE` is stamped on the proxy fn so a later `mapSchema`/`toConfig` that drops field-config symbols still lets Islands call locals.

`filterInternalFieldsAndTypes` is exported from `@graphql-tools/stitch` (federation still re-exports it for compatibility).
