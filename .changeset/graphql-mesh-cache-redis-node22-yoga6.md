---
"@graphql-mesh/cache-redis": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Redis quit used to hang off destroy-pubsub (and briefly an injected disposables option). Connection lifecycle belongs on the cache instance so Gateway/Mesh shutdown always runs `quit`, even when no pubsub subscriber exists.

## What changed

- Client closed via `[DisposableSymbols.dispose]`
- Unused `pubsub` / injected `disposables` constructor options removed
- Hive `log` kept for IAM / connection diagnostics

## How to migrate

1. Remove `pubsub` / `disposables` from `new RedisCache(...)`.
2. Pass `log` for connection/IAM diagnostics.
3. Use `await using` or `disposables.use(cache)`.

#### Example
```ts
import RedisCache from '@graphql-mesh/cache-redis'
import { Logger } from '@graphql-hive/logger'

// Before: new RedisCache({ host, pubsub, disposables })
await using cache = new RedisCache({ host: '127.0.0.1', log: new Logger() })
```
