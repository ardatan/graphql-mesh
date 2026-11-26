---
'@graphql-tools/stitch': patch
---

Surface shared-root Parallel subgraph errors when they explain a hole in the merged object (for example a downed subgraph), forward them through root proxying into graphql-js, and keep internal `CRITICAL_ERROR` / speculative `@provides` probe failures off successful partial results.
