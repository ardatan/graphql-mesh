---
'@graphql-mesh/fusion-composition': patch
---

Respect existing transformation done in the given subgraph schema

If the given subgraph has the transformed elements with `@source` directive, then the composition should respect it;

```graphql
type Query {
  user: User @source(type: "MyUser") # This means `User` is actually `MyUser` in the actual subgraph
}

type User @source(name: "MyUser") {
  id: ID
  name: String
}
```
