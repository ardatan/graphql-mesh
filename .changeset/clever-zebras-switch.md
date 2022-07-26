---
"@graphql-mesh/config": patch
"@graphql-mesh/merger-bare": patch
---

Fix a bug that is causing the additional resolvers to be ignored when there is a single source with an executor(GraphQL handler e.g.) because resolvers are added to the schema while the execution should respect those.
