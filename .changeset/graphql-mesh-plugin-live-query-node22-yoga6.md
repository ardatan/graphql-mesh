---
"@graphql-mesh/plugin-live-query": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

Live Query must subscribe once at init but invalidate per operation. Requiring plugin `log` and always using options.pubsub ignored Gateway/Yoga request context.

## What changed ()

- Required `log` option removed
- Init subscribe still uses plugin/Gateway `pubsub`
- Invalidations prefer `context.pubsub ?? options.pubsub`
- `fakePromise` for fire-and-forget subscribe

## How to migrate

Drop `log` from `useMeshLiveQuery(...)`. Keep providing `pubsub` for startup subscribe.

#### Example
```ts
import useMeshLiveQuery from '@graphql-mesh/plugin-live-query'

useMeshLiveQuery({
 ...meshPluginOptions,
 invalidations: [{ field: 'Mutation.updateUser', invalidate: ['Query.user'] }],
})
```
