---
'@graphql-mesh/merger-stitching': minor
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/cli': minor
---

Legacy multi-source Mesh (`getMesh`, `mesh build`, `mesh dev`) now composes a federation/join-style supergraph under the hood and runs against that path with in-process subgraph executors. When composition cannot represent a legacy graph (for example overlapping subscription fields that Federation rejects), classic stitching remains as a fallback.

User-facing APIs stay the same (`getMesh`, `createMeshHTTPHandler`, generated `createBuiltMeshHTTPHandler`, etc.). Under the hood, `mesh build` / `mesh dev` write `.mesh/supergraph.graphql.ts` (and a plain `.mesh/supergraph.graphql` for path-based Gateway / `hive-gateway`), and `mesh start` / `mesh dev` feed that supergraph to Hive Gateway (`createGatewayRuntime`) with an in-process `mesh` transport for `mesh://legacy/<source>` join URLs — the same execution model as `handleFederationSupergraph` inside `getMesh`. When no supergraph artifact exists (stitch fallback), serve keeps the previous Mesh HTTP path.

No migration is required for existing `.meshrc` configs. After `getMesh`, the composed SDL is also available on `schema.extensions.supergraphSdl` when the under-the-hood path succeeds.
