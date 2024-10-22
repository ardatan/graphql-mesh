---
'@graphql-mesh/serve-cli': patch
---

`--fork` option wont fail silently if NaN is provided or the number exceeds available parallelism
