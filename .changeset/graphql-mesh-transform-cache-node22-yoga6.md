---
"@graphql-mesh/transform-cache": major
---

- Require Node.js `>=22.18.0`
- Waiters use `Promise.withResolvers`; forward `pubsub.subscribe` failures
- Use Hive `PubSub` and `fakePromise` from original packages
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
