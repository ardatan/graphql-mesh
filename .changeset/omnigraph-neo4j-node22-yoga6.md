---
"@omnigraph/neo4j": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Use Hive `Logger` / `PubSub` from original packages

#### Example
```ts
import { loadGraphQLSchemaFromNeo4J } from '@omnigraph/neo4j'
import { Logger } from '@graphql-hive/logger'
import type { PubSub } from '@graphql-hive/pubsub'

const schema = await loadGraphQLSchemaFromNeo4J('Neo4j', {
  endpoint: 'bolt://localhost',
  logger: new Logger(),
  pubsub,
})
```
