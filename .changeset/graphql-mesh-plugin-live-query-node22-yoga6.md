---
"@graphql-mesh/plugin-live-query": major
---

- Require Node.js `>=22.18.0`
- Remove required `log` option; invalidations no longer need a logger argument
- Require `pubsub` from Mesh/Gateway; use `fakePromise` for subscribe fire-and-forget
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
