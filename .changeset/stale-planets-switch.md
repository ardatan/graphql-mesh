---
"@graphql-mesh/transform-extend": patch
---

fix(extend): Temporary fix for the existing Node.js users

Currently this transform would work only for Node.js users. We can introduce some new configuration options to cover this transform's use cases because transforms have some limitations like running sync instead of async etc.
