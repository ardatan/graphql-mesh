---
'@graphql-mesh/plugin-deduplicate-request': patch
'@graphql-mesh/runtime': patch
---

Clone Response for deduplication instead of reading it first, it no longer needs accept header to be json
