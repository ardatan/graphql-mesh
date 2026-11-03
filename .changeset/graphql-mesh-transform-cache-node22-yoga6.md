---
"@graphql-mesh/transform-cache": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, builtins, promise helpers).

## Motivation

Cache-transform waiters mixed Mesh promise helpers with weak subscribe error handling. Use `Promise.withResolvers` and Hive PubSub so invalidation races surface clearly.

## What changed ()

- Waiters use `Promise.withResolvers`; subscribe failures are forwarded
- Hive `PubSub` + `fakePromise` from their packages

## How to migrate

Pass a Hive `PubSub` instance. YAML cache rules are unchanged.

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
