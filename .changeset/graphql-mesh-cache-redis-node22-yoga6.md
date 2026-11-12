---
"@graphql-mesh/cache-redis": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

Redis subscribed to `destroy` via optional ctor `pubsub` and used `logger` for connection/IAM logs. Teardown is now `[DisposableSymbols.dispose]`; `pubsub` is removed; logging uses `log`.

## What changed ()

- Client closed via `[DisposableSymbols.dispose]` (no destroy-pubsub subscriber)
- `pubsub` constructor option removed
- Option field `logger` renamed to `log`

## How to migrate

1. Remove `pubsub` from `new RedisCache(...)`.
2. Pass `log` instead of `logger`.
3. Use `await using` or `disposables.use(cache)`.

#### Example
```ts
import RedisCache from '@graphql-mesh/cache-redis'
import { Logger } from '@graphql-hive/logger'

// before: new RedisCache({ host, pubsub, logger })
await using cache = new RedisCache({ host: '127.0.0.1', log: new Logger() })
```
