---
"@graphql-mesh/cache-upstash-redis": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Cleanup via `[DisposableSymbols]`; Hive logger typing; no injected `disposables` option

#### Example
```ts
import UpstashRedisCache from '@graphql-mesh/cache-upstash-redis'

await using cache = new UpstashRedisCache({ url, token })
// register with disposables.use(cache) in getMesh / Gateway
```
