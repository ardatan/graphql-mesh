---
"@graphql-mesh/cache-upstash-redis": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Same disposable-cache model as other Redis adapters: Mesh/Gateway dispose the cache; the adapter does not listen for destroy-pubsub.

## What changed

- Cleanup via `[DisposableSymbols]`; no injected disposables / unused pubsub option

## How to migrate

Construct the cache without pubsub/disposables and register it on the Mesh/Gateway stack.

#### Example
```ts
import UpstashRedisCache from '@graphql-mesh/cache-upstash-redis'

await using cache = new UpstashRedisCache({ url, token })
```
