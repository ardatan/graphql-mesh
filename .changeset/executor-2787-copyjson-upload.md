---
'@graphql-tools/executor-common': patch
'@graphql-tools/executor-http': patch
---

Less CPU per shared subgraph HTTP hop.

`copyJson` is exported from `@graphql-tools/executor-common` for a plain JSON deep copy (faster than `structuredClone`). Shared inflight consumers of `@graphql-tools/executor-http` use it for `data`, and the last consumer keeps the original. Variables are scanned for uploads before `extractFiles` clones them, so ordinary JSON variable bags skip multipart work. When `@graphql-hive/signal` exposes `disposeAbortSignal`, the HTTP executor releases the combined request signal once a non-streaming result is in.
