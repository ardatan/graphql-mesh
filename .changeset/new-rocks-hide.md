---
'@graphql-mesh/fusion-composition': patch
---

Do not filter root types if they don't have any fields accessible. Previously filtering all Mutation fields would make the Mutation type inaccessible, which is not the intended behavior. Root types should only be filtered if they are explicitly marked as inaccessible or if they have no fields and are not root types.
In that case when Mutation is marked inaccessible, all the other subgraphs' Mutation fields are also marked inaccessible. Now Mutation is not marked inaccessible, but all the fields are marked inaccessible, which is the intended behavior.
