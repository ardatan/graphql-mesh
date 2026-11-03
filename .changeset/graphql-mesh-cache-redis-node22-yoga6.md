---
"@graphql-mesh/cache-redis": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Cleanup via `[DisposableSymbols.dispose]`; stop taking `disposables` / unused `pubsub` constructor options (destroy-pubsub lifecycle removed)
- Use Hive `Logger` from `@graphql-hive/logger` for init diagnostics

#### Example
```ts
import RedisCache from '@graphql-mesh/cache-redis'
import { Logger } from '@graphql-hive/logger'

// Before: new RedisCache({ host, pubsub, disposables })
await using cache = new RedisCache({ host: '127.0.0.1', log: new Logger() })
// Mesh/Gateway: disposables.use(cache) — dispose closes the Redis client
```
