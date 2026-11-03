---
"@graphql-mesh/fusion-composition": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Type-only filter globs like `!User` are removed from `createFilterTransform`; use `Type.!User`

#### Example
```ts
import { createFilterTransform } from '@graphql-mesh/fusion-composition'

createFilterTransform({
  filters: [
    // Before: '!User'
    'Type.!User',
    'Query.user.!pk',
  ],
})
```
