---
"@graphql-mesh/transport-neo4j": major
---

- Require Node.js `>=22.18.0`
- PubSub EventEmitter bridge: call `pubsub.publish` directly (no `fakePromise` wrap); guard `once` against double delivery
- Use Hive `PubSub` from `@graphql-hive/pubsub`
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
- Neo4j executor exposes `[DisposableSymbols.asyncDispose]` directly for driver close
