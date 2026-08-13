---
'@graphql-mesh/transform-filter-schema': patch
---

Fix invalid schema AST after filtering out empty root operation types (e.g. Mutation.!*), so follow-up transforms like extend can merge schemas without `Unknown type "Mutation"`.
