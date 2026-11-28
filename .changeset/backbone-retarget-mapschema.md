---
'@graphql-tools/stitch': minor
'@graphql-tools/federation': minor
---

`stitchSchemas` stays generic: optional `onStitchedSchema` runs immediately before shared backbone root proxies install. No federation filter inside stitch. No `overrideLabels` / `handleProgressiveOverride` on stitch or attach options — progressive override uses per-request active labels on context only (no `schema.extensions` stash / `readProgressiveOverride`).

Federation `getStitchedSchemaFromSupergraphSdl` restores user `onStitchedSchema`. It runs `filterInternalFieldsAndTypes` (owned by `@graphql-tools/federation`) then the user hook inside stitch `onStitchedSchema`, so proxies attach once to the public schema. No snapshot/mark of late root overrides as `localFields` — no Mesh/Hive-gateway production caller replaces Query/Mutation resolvers that way. External post-stitch `mapSchema` is unsupported. Root proxy marks use module WeakSets; Island originals use a field→resolve WeakMap. Root proxies memoize `document` via `memoize2(operation, fragments)`. `installRootProxyingResolvers` is the single install API (root proxies call `backboneExecutor(request)` with no schema arg). `getBackboneExecutorBySchema` is `memoize1(schema => request => backboneExecutor(request, schema))` — does not mutate `info.schema`. Plan cache is per-schema `memoize2(request.document, activeLabels)` (gateway owns labels; no stitch-side percent special-case). `backboneExecutor(request, schema?)` uses the arg else `request.info.schema`.
