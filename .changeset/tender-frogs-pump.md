---
'@graphql-mesh/transform-hive': patch
'@graphql-mesh/serve-runtime': patch
'@graphql-mesh/plugin-hive': patch
---

Upgrade Hive SDK to use latest fixing [HTTP `ECONNRESET` when running behind a proxy caused in former dependency Axios](https://github.com/axios/axios/issues/5267).
