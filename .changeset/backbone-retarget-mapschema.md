---
'@graphql-tools/stitch': minor
'@graphql-tools/federation': minor
---

`stitchSchemas` stays generic: optional `onStitchedSchema` runs immediately before shared backbone root proxies install. No federation filter inside stitch. No `overrideLabels` / `handleProgressiveOverride` on stitch or attach options — progressive override uses per-request active labels on context only (plan cache keys off that; no `schema.extensions` stash / `readProgressiveOverride`).

Federation `getStitchedSchemaFromSupergraphSdl` restores user `onStitchedSchema`. It runs `filterInternalFieldsAndTypes` (owned by `@graphql-tools/federation`) then the user hook inside stitch `onStitchedSchema`, so proxies attach once to the public schema. No snapshot/mark of late root overrides as `localFields` — no Mesh/Hive-gateway production caller replaces Query/Mutation resolvers that way. External post-stitch `mapSchema` is unsupported. Root proxy marks use module WeakSets; Island originals use a field→resolve WeakMap. Root proxies memoize `document` by `info.operation` so plan cache keys by `request.document` (no `info.operation === operation` branch). `attachBackboneExecutor` installs proxies (calls shared `backboneExecutor` directly — no executor injector on `installRootProxyingResolvers`); `createBackboneExecutor` / `getBackboneExecutor` only bind the executor and do not attach. `backboneExecutor(request, schema?)` resolves schema from the arg else `info.schema`.
