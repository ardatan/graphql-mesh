---
'@graphql-mesh/merger-federation': minor
'@graphql-mesh/merger-stitching': major
'@graphql-mesh/merger-bare': minor
'@graphql-mesh/config': minor
'@graphql-mesh/transform-type-merging': minor
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/cli': minor
---

Legacy multi-source Mesh now uses a **federation merger** (`@graphql-mesh/merger-federation`) as the only multi-source merger: sources → subgraphs via `composeSubgraphs` (like Mesh v2), then `handleFederationSupergraph` with in-process source executors for the Mesh UX path. Classic `stitchSchemas` is removed. `@graphql-mesh/merger-stitching` re-exports the federation merger for back-compat with `merger: stitching`.

User-facing APIs stay the same (`getMesh`, `createMeshHTTPHandler`, generated `createBuiltMeshHTTPHandler`, `.meshrc`). Default `merger` for multi-source configs is `federation` (single-source still defaults to `bare`). Under the hood, `mesh build` / `mesh dev` write `.mesh/supergraph.graphql.ts` (SDL + programmatic `createBuiltHiveGateway`) and plain `.mesh/supergraph.graphql`. `mesh start` / `mesh dev` feed that Supergraph to Hive Gateway when present — **no custom `mesh://` in-process transport**; Gateway uses standard transports from `@transport` in the Supergraph.

`transform-type-merging` now stamps Fed `@key(fields)` / Mesh `@merge` (and Fed `@requires` for computed fields) instead of stitch `subschemaConfig.merge`.

No `.meshrc` migration is required for typical configs. After `getMesh`, the composed SDL is on `schema.extensions.supergraphSdl` when composition succeeds. Composition failures now surface instead of silently falling back to stitching — fix overlapping Subscription fields (prefix/encapsulate) or type-merging keys as needed.
