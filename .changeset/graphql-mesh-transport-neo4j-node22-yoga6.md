---
"@graphql-mesh/transport-neo4j": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- PubSub EventEmitter bridge: call `pubsub.publish` directly (no `fakePromise` wrap); guard `once` against double delivery
- Use Hive `PubSub` from `@graphql-hive/pubsub`
- Neo4j executor exposes `[DisposableSymbols.asyncDispose]` directly for driver close

#### Example
```ts
import { getNeo4JExecutor } from '@graphql-mesh/transport-neo4j'
import type { PubSub } from '@graphql-hive/pubsub'

await using executor = await getNeo4JExecutor({ driver, pubsub })
// driver closed via asyncDispose; pubsub.publish used directly on events
```
