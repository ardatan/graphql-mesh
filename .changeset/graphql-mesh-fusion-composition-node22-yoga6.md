---
"@graphql-mesh/fusion-composition": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Fusion filter transforms accepted the same ambiguous type-only globs as legacy filter-schema. Compose-time filters must share the explicit `Type.` grammar so composed supergraphs do not drop the wrong things.

## What changed in this package

- `createFilterTransform` rejects type-only globs like `!User`; use `Type.!User`

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
