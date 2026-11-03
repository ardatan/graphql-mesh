---
"@graphql-mesh/cache-redis": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Redis used destroy-pubsub (and briefly a disposables option) to quit the client. Explicit dispose is clearer for connection pools and matches Gateway shutdown.

## What changed in this package

- Close the Redis client via `[DisposableSymbols.dispose]`
- Drop unused `pubsub` / injected `disposables` constructor options
- Keep required Hive `log` for IAM / connection diagnostics

#### Example
```ts
import RedisCache from '@graphql-mesh/cache-redis'
import { Logger } from '@graphql-hive/logger'

// Before: new RedisCache({ host, pubsub, disposables })
await using cache = new RedisCache({ host: '127.0.0.1', log: new Logger() })
```
