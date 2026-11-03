---
"@graphql-mesh/cache-redis": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Cleanup via `[DisposableSymbols.dispose]`; stop taking a `disposables` constructor option
- Use Hive `Logger` / `PubSub` types from original packages

#### Example
```ts
import RedisCache from '@graphql-mesh/cache-redis'

// Before: new RedisCache({ host, disposables })
await using cache = new RedisCache({ host: '127.0.0.1' })
// Mesh/Gateway: disposables.use(cache) — dispose closes the Redis client
```
