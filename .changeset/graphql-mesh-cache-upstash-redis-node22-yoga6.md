---
"@graphql-mesh/cache-upstash-redis": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Same disposable-cache model as other Redis adapters: Mesh registers the cache; the adapter closes itself without destroy-pubsub.

## What changed in this package

- Cleanup via `[DisposableSymbols]`; no injected `disposables` / unused pubsub option

#### Example
```ts
import UpstashRedisCache from '@graphql-mesh/cache-upstash-redis'

await using cache = new UpstashRedisCache({ url, token })
// or: disposables.use(cache)
```
