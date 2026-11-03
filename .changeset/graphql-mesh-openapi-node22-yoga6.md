---
"@graphql-mesh/openapi": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Use Hive logger/pubsub packages; drop Mesh cross-helpers / re-exports

#### Example
```ts
import Handler from '@graphql-mesh/openapi'
import type { Logger } from '@graphql-hive/logger'
import type { PubSub } from '@graphql-hive/pubsub'

const handler = new Handler({
  name: 'API',
  config: { source: './openapi.yaml' },
  logger, // from @graphql-hive/logger
  pubsub, // from @graphql-hive/pubsub
})
```
