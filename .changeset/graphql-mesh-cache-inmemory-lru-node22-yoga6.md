---
"@graphql-mesh/cache-inmemory-lru": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

In-memory LRU subscribed to Mesh `destroy` pubsub to clear TTL timeouts. After destroy-pubsub was removed, the `pubsub` constructor option did nothing — a footgun for anyone still passing it. Disposal now clears timeouts via `[DisposableSymbols.dispose]`.

## What changed

- `[DisposableSymbols.dispose]` clears TTL timeouts
- `pubsub` constructor option removed
- Direct dependency on `@whatwg-node/disposablestack`

## How to migrate

1. Remove `{ pubsub }` from `new InMemoryLRUCache(...)`.
2. Register the cache with Mesh/Gateway disposables (automatic if passed to `getMesh`).

#### Example
```ts
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru'

// Before: new InMemoryLRUCache({ pubsub })
const cache = new InMemoryLRUCache({ max: 1000 })
disposables.use(cache)
```
