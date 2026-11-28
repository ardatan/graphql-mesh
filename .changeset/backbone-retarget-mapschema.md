---
'@graphql-tools/stitch': minor
'@graphql-tools/federation': minor
---

`stitchSchemas` stays generic: optional `onStitchedSchema` runs immediately before shared backbone root proxies install. No federation filter inside stitch.

Federation `getStitchedSchemaFromSupergraphSdl` restores user `onStitchedSchema`. It runs `filterInternalFieldsAndTypes` (owned by `@graphql-tools/federation`) then the user hook (marking late root overrides as `localFields`) inside stitch `onStitchedSchema`, so proxies attach once to the public schema. External post-stitch `mapSchema` is unsupported — no proxy-stamped `ORIGINAL_RESOLVE` / retarget / WeakMap / `schema.extensions.backboneExecutor`. Root proxy marks use module WeakSets; plan cache is keyed by context object without mutating it. The backbone is one generic executor/proxy that plans against `info.schema` / `stitchingInfo`. `getBackboneExecutor(schema)` forces the bound schema (nested-gateway safe).
