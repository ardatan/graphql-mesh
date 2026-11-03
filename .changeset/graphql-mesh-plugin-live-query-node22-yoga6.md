---
"@graphql-mesh/plugin-live-query": major
---

- Require Node.js `>=22.18.0`
- Remove required `log` option; invalidations no longer need a logger argument
- Init-time `pubsub` still comes from Mesh plugin options / Hive Gateway `ctx` (needed to subscribe); request invalidations prefer GraphQL `context.pubsub` when present
- Use `fakePromise` for subscribe fire-and-forget
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
