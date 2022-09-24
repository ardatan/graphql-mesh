---
'@graphql-mesh/runtime': patch
---

Choose the root type name for a specific operation type from the source schema not from the gateway schema, because source schema might have a different like `QueryType` instead of `Query`.
