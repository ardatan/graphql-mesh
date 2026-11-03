---
"@graphql-mesh/plugin-rate-limit": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment only; rate-limit plugin API unchanged beyond shared notes

#### Example
```ts
import { useMeshRateLimit } from '@graphql-mesh/plugin-rate-limit'
useMeshRateLimit({ ...meshPluginOptions, config: [{ type: 'Query', field: 'users', max: 10, ttl: 60 }] })
```
