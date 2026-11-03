---
"@graphql-mesh/neo4j": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Executor cleanup via `[DisposableSymbols.asyncDispose]`
- Use Hive `Logger` / `PubSub` from original packages

#### Example
```ts
import Neo4jHandler from '@graphql-mesh/neo4j'

const handler = new Neo4jHandler({
  name: 'Neo4j',
  config: { endpoint: 'bolt://localhost', database: 'neo4j' },
})
disposables.use(handler)
```
