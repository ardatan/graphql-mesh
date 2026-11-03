---
"@graphql-mesh/transform-cache": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Cache-transform waiters previously mixed Mesh promise helpers with swallowed subscribe errors. Using `Promise.withResolvers` and Hive PubSub makes waiter cancellation and error propagation predictable under Yoga 6.

## What changed in this package

- Waiters use `Promise.withResolvers`; forward `pubsub.subscribe` failures
- Use Hive `PubSub` and `fakePromise` from their packages (no Mesh re-exports)

#### Example
```ts
import CacheTransform from '@graphql-mesh/transform-cache'
import type { PubSub } from '@graphql-hive/pubsub'

const transform = new CacheTransform({
  config: [{ field: 'Query.user', cacheKey: 'user-{args.id}', invalidate: { ttl: 60 } }],
  pubsub, // @graphql-hive/pubsub
  cache,
  ...meshTransformOptions,
})
```
