---
'@graphql-mesh/fusion-composition': patch
'@graphql-mesh/fusion-runtime': patch
---

If the target hoisted field is a new field name that doesn't exist, create that field and keep the
existing one;

```ts
createHoistFieldTransform({
  mapping: [
    {
      typeName: 'Query',
      pathConfig: ['users', 'results'],
      newFieldName: 'usersResults',
    },
  ],
})
```

```diff
type Query {
  users(limit: Int!, page: Int): UserSearchResult # Keep this
+ usersResults(limit: Int!, page: Int): [User!]! # Add a new one
}

scalar _HoistConfig

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}
```
