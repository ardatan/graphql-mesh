---
'@graphql-mesh/merger-stitching': minor
'@graphql-mesh/fusion-composition': patch
---

Legacy multi-source Mesh (`getMesh`, `mesh build`, `mesh dev`) now composes a federation/join-style supergraph under the hood and runs against that path with in-process subgraph executors. When composition cannot represent a legacy graph (for example overlapping subscription fields that Federation rejects), classic stitching remains as a fallback.

No migration is required for existing `.meshrc` configs. After `getMesh`, the composed SDL is available on `schema.extensions.supergraphSdl` when the under-the-hood path succeeds.
