---
'@graphql-mesh/plugin-hive': patch
---

Do not hook into `terminate` events of Node.js, because Mesh handles it already

Hooking into those events cause a memory leak because plugins are initialized on each polling iteration in legacy Mesh CLI/Runtime
