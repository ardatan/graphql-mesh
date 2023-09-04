---
'@graphql-mesh/runtime': patch
'@graphql-mesh/http': patch
'@graphql-mesh/cli': patch
---

Performance optimizations for Node.js
- Fork the cluster worker again when it dies
- Avoid unnecessary promises
