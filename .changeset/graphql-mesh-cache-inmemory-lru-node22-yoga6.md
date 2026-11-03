---
"@graphql-mesh/cache-inmemory-lru": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, builtins, promise helpers).

## Motivation

InMemoryLRU accepted optional `pubsub` and subscribed to `destroy` to clear TTL timeouts. That lifecycle is gone. The cache implements `[DisposableSymbols.dispose]` and no longer takes `pubsub`.

## What changed ()

- `[DisposableSymbols.dispose]` clears TTL timeouts
- `pubsub` constructor option removed (it existed for destroy subscribe)

## How to migrate

1. Remove `{ pubsub }` from `new InMemoryLRUCache(...)`.
2. Let `getMesh` register the cache, or call `disposables.use(cache)` yourself.

#### Example
```ts
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru'

// before: new InMemoryLRUCache({ pubsub })
const cache = new InMemoryLRUCache({ max: 1000 })
disposables.use(cache)
```
