---
"@graphql-mesh/config": minor
---

Today we pass the executor and the schema as-is if there is only one source but if there is an additionalResolvers definition with `selectionSet`, we need the query planner of Schema Stitching so we need to use `stitching` merger even if there is one source.
