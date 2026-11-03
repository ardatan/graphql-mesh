---
"@graphql-mesh/cache-upstash-redis": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major vs `master` (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub -> disposables, builtins, promise helpers).

## Motivation

Align Upstash Redis cache with the same disposable-cache model as other Redis adapters (dispose the instance; do not rely on destroy-pubsub).

## What changed (vs `master`)

- Cleanup via `[DisposableSymbols]`

## How to migrate

Register the cache on the Mesh/Gateway disposable stack (automatic via `getMesh`).

#### Example
```ts
import UpstashRedisCache from '@graphql-mesh/cache-upstash-redis'

await using cache = new UpstashRedisCache({ url, token })
```
