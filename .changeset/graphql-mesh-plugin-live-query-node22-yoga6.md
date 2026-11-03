---
"@graphql-mesh/plugin-live-query": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Remove required `log` option; invalidations no longer need a logger argument
- Init-time `pubsub` still comes from Mesh plugin options / Hive Gateway `ctx` (needed to subscribe); request invalidations prefer GraphQL `context.pubsub` when present
- Use `fakePromise` for subscribe fire-and-forget

#### Example
```ts
import { useMeshLiveQuery } from '@graphql-mesh/plugin-live-query'

// Before: useMeshLiveQuery({ log, pubsub, ... })
useMeshLiveQuery({
  ...meshPluginOptions, // pubsub used at init to subscribe
  invalidations: [{ field: 'Mutation.updateUser', invalidate: ['Query.user'] }],
})
// at request time, invalidation uses context.pubsub ?? options.pubsub
```
