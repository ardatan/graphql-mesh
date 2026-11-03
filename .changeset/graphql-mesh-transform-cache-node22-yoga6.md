---
"@graphql-mesh/transform-cache": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Cache-transform waiters mixed Mesh promise helpers with swallowed `pubsub.subscribe` failures, which made invalidation races hard to debug. `Promise.withResolvers` plus Hive PubSub errors that surface correctly under Yoga 6.

## What changed

- Waiters use `Promise.withResolvers`; subscribe failures are forwarded
- Hive `PubSub` + `fakePromise` from their packages (no Mesh re-exports)

## How to migrate

Ensure the transform receives a Hive `PubSub` instance. No YAML shape change for field cache rules.

#### Example
```ts
import CacheTransform from '@graphql-mesh/transform-cache'
import type { PubSub } from '@graphql-hive/pubsub'

const transform = new CacheTransform({
  config: [{ field: 'Query.user', cacheKey: 'user-{args.id}', invalidate: { ttl: 60 } }],
  pubsub,
  cache,
  ...meshTransformOptions,
})
```
