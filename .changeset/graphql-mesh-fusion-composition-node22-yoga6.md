---
"@graphql-mesh/fusion-composition": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Fusion composition’s `createFilterTransform` accepted the same ambiguous type-only globs as legacy filter-schema. Compose is the wrong place for silent ambiguity: a bad filter changes the supergraph for every gateway. Aligning on `Type.` keeps Mesh and Fusion one mental model.

## What changed

- `createFilterTransform` rejects type-only globs like `!User`; require `Type.!User`

## How to migrate

Update any programmatic or YAML filters passed into fusion composition the same way as `@graphql-mesh/transform-filter-schema`.

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
