---
'@graphql-mesh/plugin-response-cache': patch
---

When a subgraph returns cache control headers with a certain TTL, respect that during the calculation of overall TTL in the response cache plugin
