---
"@graphql-mesh/cache-inmemory-lru": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

The LRU cache subscribed to Mesh `destroy` pubsub to clear timeouts. That lifecycle is gone; Mesh/Gateway already know how to dispose resources. Keeping a unused `pubsub` option after removing the subscriber would only confuse migrations.

## What changed in this package

- Implement `[DisposableSymbols.dispose]` (clear TTL timeouts) for `disposables.use(cache)`
- Drop unused `pubsub` constructor option
- Depend on `@whatwg-node/disposablestack` directly

#### Example
```ts
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru'

// Before: new InMemoryLRUCache({ pubsub }) // subscribed to destroy
const cache = new InMemoryLRUCache({ max: 1000 })
disposables.use(cache)
```
