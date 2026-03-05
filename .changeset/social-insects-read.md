---
'@graphql-mesh/fusion-composition': patch
---

If the encapsulated fields are conflicting, they will be renamed to include the subgraph name as a prefix and the renamed fields will be marked with the `@inaccessible` directive. For example, if both Subgraph A and Subgraph B have a `getItems` field, they will be renamed to `_encapsulated_SubgraphA_getItems` and `_encapsulated_SubgraphB_getItems` respectively, and the original `getItems` fields will be removed from the root type to prevent conflicts.

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


