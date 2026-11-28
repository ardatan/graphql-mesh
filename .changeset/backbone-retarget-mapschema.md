---
'@graphql-tools/stitch': patch
'@graphql-tools/federation': patch
---

Retarget the stitch backbone after `mapSchema` / late `onStitchedSchema` root overrides instead of creating a new executor. `retargetBackboneToSchema` reuses the live runtime (progressive-override closure intact), restores `ORIGINAL_RESOLVE` when filter drops the symbol (preferring a non-proxy post-mapSchema resolve for OpenAPI/OData `resolveType`), and reinstalls root proxies so Islands do not re-enter the plan. Federation `getStitchedSchemaFromSupergraphSdl` retargets after `filterInternalFieldsAndTypes` and after late root overrides marked local.
