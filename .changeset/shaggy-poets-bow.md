---
'@graphql-mesh/cache-redis': patch
---

Use `SCAN` instead of `KEYS` to avoid the error `ERR KEYS command is disabled because total
number of keys is too large, please use SCAN`
