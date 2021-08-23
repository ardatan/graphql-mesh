---
'@graphql-mesh/config': minor
'@graphql-mesh/runtime': minor
'@graphql-mesh/transform-federation': minor
'@graphql-mesh/types': minor
'@graphql-mesh/utils': minor
---

Some improvements on additional resolvers;

- Now you can point to the nested fields in `keyArgs`; e.g. `keysArg: "where.ids"`
- You don't need `returnType` for abstract types anymore, because it's inferred from the type of `targetFieldName`.


