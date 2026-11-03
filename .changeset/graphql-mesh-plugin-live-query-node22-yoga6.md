---
"@graphql-mesh/plugin-live-query": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Live Query must **subscribe once at init** (needs a pubsub handle) but **invalidate per operation**. Requiring plugin `log` and always using `options.pubsub` ignored Gateway/Yoga request context and made invalidations log/publish on the wrong instance in multi-tenant gateways.

## What changed

- Required `log` option removed
- Init subscribe still uses plugin/Gateway `pubsub`
- Invalidations prefer `context.pubsub ?? options.pubsub`
- `fakePromise` for fire-and-forget subscribe

## How to migrate

1. Drop `log` from `useMeshLiveQuery(...)`.
2. Keep providing `pubsub` through Mesh plugin options / Gateway ctx for startup subscribe.
3. If you publish invalidations manually, prefer the request’s `context.pubsub` when present.

#### Example
```ts
import useMeshLiveQuery from '@graphql-mesh/plugin-live-query'

// Before: useMeshLiveQuery({ log, pubsub, invalidations })
useMeshLiveQuery({
  ...meshPluginOptions,
  invalidations: [{ field: 'Mutation.updateUser', invalidate: ['Query.user'] }],
})
```
