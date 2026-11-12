---
"@graphql-mesh/cache-localforage": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

Localforage forwarded `pubsub` into the InMemoryLRU fallback for destroy cleanup. That path is gone.

## What changed ()

- `pubsub` constructor option removed
- Unsupported-driver fallback is `new InMemoryLRUCache()` with no pubsub

## How to migrate

Remove `pubsub` from `new LocalforageCache({ ... })` if you passed it.

#### Example
```ts
import LocalforageCache from '@graphql-mesh/cache-localforage'

// before: new LocalforageCache({ driver: [...], pubsub })
const cache = new LocalforageCache({ driver: ['INDEXEDDB', 'LOCALSTORAGE'] })
```
