---
"@graphql-mesh/cache-localforage": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Localforage forwarded `pubsub` only so its InMemoryLRU fallback could subscribe to destroy. With that gone, the option is dead weight on both constructors.

## What changed in this package

- Drop unused `pubsub` constructor option
- Unsupported-driver fallback is `new InMemoryLRUCache()` with no pubsub

#### Example
```ts
import LocalforageCache from '@graphql-mesh/cache-localforage'

// Before: new LocalforageCache({ driver: [...], pubsub })
const cache = new LocalforageCache({ driver: ['INDEXEDDB', 'LOCALSTORAGE'] })
```
