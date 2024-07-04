---
'@graphql-mesh/fusion-runtime': patch
---

Cleanup created transport executors per schema change
Previously they were cleaned up only on server close, which could lead to memory leaks in case of schema changes.
