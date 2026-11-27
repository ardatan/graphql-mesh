---
'@graphql-mesh/merger-federation': major
'@graphql-mesh/config': major
'@graphql-mesh/http': minor
'@graphql-mesh/graphql': major
'@graphql-mesh/transform-type-merging': minor
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/cli': minor
---

**Breaking:** `@graphql-mesh/merger-stitching` and `@graphql-mesh/merger-bare` are **removed**. Legacy Mesh uses only `@graphql-mesh/merger-federation` (under-the-hood Supergraph). Configs with `merger: bare` or `merger: stitching` are remapped to `federation` with a warning; prefer omitting `merger` or setting `merger: federation`.

Sources → subgraphs via `composeSubgraphs` (like Mesh v2), then `handleFederationSupergraph` with in-process source executors for the Mesh UX path. Classic `stitchSchemas` is gone. Composition failures surface (no silent stitch fallback).

The GraphQL HTTP handler no longer builds stitch `subschemaConfig.merge` via `getSubschemaForFederationWithTypeDefs`; entity planning uses Supergraph composition from subgraph SDL (`@key` / Fed `@link`). Prefer current omnigraph / compose loaders (`loadSqlSubgraph`, `loadGraphQLHTTPSubgraph`, …) for new work; v0 YAML handlers that already wrap those loaders (e.g. `postgraphile` → `@omnigraph/sql`) stay valid.

User-facing APIs stay the same: `getMesh`, `createMeshHTTPHandler`, generated `createBuiltMeshHTTPHandler`, `.meshrc`. Default merger is `federation`. `createMeshHTTPHandler` runs **Hive Gateway under the hood** when `schema.extensions.supergraphSdl` is present (CLI `serve` surface unchanged — still calls `createMeshHTTPHandler`). `mesh build` / `mesh dev` also write `.mesh/supergraph.graphql` + `.mesh/supergraph.graphql.ts` (`export default /* GraphQL */ \`…\`;`, imported by the Mesh artifact — no `createBuiltHiveGateway`). No custom `mesh://` transport.

`transform-type-merging` stamps Fed `@key(fields)` / Mesh `@merge(subgraph: …)` (and Fed `@requires` for computed fields) instead of stitch `subschemaConfig.merge`. Selection sets keep the full field list (`sku locale`, nested selections). `types[].canonical` is rejected with an explicit error (stitch canonical is gone with the federation merger). Root-level transforms, `additionalTypeDefs`, or `additionalResolvers` after compose skip the under-the-hood Gateway HTTP path so the served field set matches `mesh.schema`.
