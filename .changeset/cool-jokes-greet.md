---
'@graphql-mesh/plugin-response-cache': patch
---

Provide cache key per oparation in a batched

Instead of per request, which would give out the same cache key for every operation in a batched request.
