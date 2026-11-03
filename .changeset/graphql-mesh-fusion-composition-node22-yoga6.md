---
"@graphql-mesh/fusion-composition": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, builtins, promise helpers).

## Motivation

Same ambiguous type-only filter globs as legacy filter-schema . Compose should not silently drop the wrong types.

## What changed ()

- `createFilterTransform` rejects type-only globs like `!User`; use `Type.!User`

## How to migrate

Update fusion/composition filters the same way as `@graphql-mesh/transform-filter-schema`.

#### Example
```ts
import { createFilterTransform } from '@graphql-mesh/fusion-composition'

createFilterTransform({
 filters: [
 // before: '!User'
 'Type.!User',
 'Query.user.!pk',
 ],
})
```
