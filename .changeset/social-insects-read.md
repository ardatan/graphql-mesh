---
'@graphql-mesh/fusion-composition': patch
---

If the encapsulated fields are conflicting, they will be renamed to include the subgraph name as a prefix. For example, if both Subgraph A and Subgraph B have a `getItems` field, they will be renamed to `_encapsulated_SubgraphA_getItems` and `_encapsulated_SubgraphB_getItems` respectively. The original `getItems` field will be hidden with an inaccessible directive to prevent conflicts.

Subgraph A

```graphql
type Query {
  getItems: [SubgraphA_Item]
}

type SubgraphA_Item {
  id: ID
}
```

Subgraph B

```graphql
type Query {
  getItems: [SubgraphB_Item]
}

type SubgraphB_Item {
  id: ID
}
```


