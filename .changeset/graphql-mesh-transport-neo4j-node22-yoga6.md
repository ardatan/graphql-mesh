---
"@graphql-mesh/transport-neo4j": major
---

- Require Node.js `>=22.18.0`
- PubSub EventEmitter bridge: call `pubsub.publish` directly (no `fakePromise` wrap); guard `once` against double delivery
- Use Hive `PubSub` from `@graphql-hive/pubsub`
