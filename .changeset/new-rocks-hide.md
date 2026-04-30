---
'@graphql-mesh/fusion-composition': patch
---

Do not mark root types inaccessible solely because all of their fields were filtered out. Previously, filtering all `Mutation` fields also made the `Mutation` type inaccessible, which was unintended.
Now, root types are only marked inaccessible when explicitly marked as such. If all `Mutation` fields are filtered, the `Mutation` type remains accessible while those fields are marked inaccessible.
