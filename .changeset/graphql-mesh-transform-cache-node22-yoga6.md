---
"@graphql-mesh/transform-cache": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Waiters use `Promise.withResolvers`; forward `pubsub.subscribe` failures
- Use Hive `PubSub` and `fakePromise` from original packages

#### Example
```ts
import CacheTransform from '@graphql-mesh/transform-cache'
import type { PubSub } from '@graphql-hive/pubsub'

const transform = new CacheTransform({
  config: [{ field: 'Query.user', cacheKey: 'user-{args.id}', invalidate: { ttl: 60 } }],
  pubsub, // @graphql-hive/pubsub
})
```
