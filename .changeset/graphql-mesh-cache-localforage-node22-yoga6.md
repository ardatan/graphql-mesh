---
"@graphql-mesh/cache-localforage": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Localforage only accepted `pubsub` to forward it into the InMemoryLRU fallback for destroy cleanup. That path is gone, so the option is removed from both constructors.

## What changed

- `pubsub` constructor option removed
- Driver-unsupported fallback: `new InMemoryLRUCache()` with no pubsub

## How to migrate

Remove `pubsub` from `new LocalforageCache({ ... })` and from YAML-driven cache options if you injected it manually.

#### Example
```ts
import LocalforageCache from '@graphql-mesh/cache-localforage'

// Before: new LocalforageCache({ driver: [...], pubsub })
const cache = new LocalforageCache({ driver: ['INDEXEDDB', 'LOCALSTORAGE'] })
```
