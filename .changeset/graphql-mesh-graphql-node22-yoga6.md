---
"@graphql-mesh/graphql": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Use Hive `Logger` / `PubSub` from original packages; drop Mesh logger/pubsub re-exports
- Node builtins via `globalThis.process?.getBuiltinModule`

#### Example
```ts
import GraphQLHandler from '@graphql-mesh/graphql'
import type { Logger } from '@graphql-hive/logger'

const handler = new GraphQLHandler({
  name: 'Upstream',
  config: { endpoint: 'https://api.example.com/graphql' },
  pubsub,
  logger, // Hive Logger
})
```
