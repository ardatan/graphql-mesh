---
"@graphql-mesh/plugin-live-query": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Live queries must subscribe once at init (needs a pubsub handle) but invalidations happen per operation. Forcing a required plugin `log` and always using options.pubsub ignored Gateway/Yoga context values that are already request-scoped.

## What changed in this package

- Remove required `log` option; invalidations no longer take a logger argument
- Init-time `pubsub` still comes from Mesh plugin options / Gateway `ctx` (subscribe setup)
- Request invalidations prefer GraphQL `context.pubsub` when present (`context.pubsub ?? options.pubsub`)
- Use `fakePromise` for subscribe fire-and-forget

#### Example
```ts
import useMeshLiveQuery from '@graphql-mesh/plugin-live-query' // default export

// Before: useMeshLiveQuery({ log, pubsub, invalidations })
useMeshLiveQuery({
  ...meshPluginOptions, // pubsub used at init to subscribe
  invalidations: [{ field: 'Mutation.updateUser', invalidate: ['Query.user'] }],
})
```
