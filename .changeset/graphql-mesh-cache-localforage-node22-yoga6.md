---
"@graphql-mesh/cache-localforage": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major vs `master` (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub -> disposables, builtins, promise helpers).

## Motivation

On `master`, Localforage forwarded `pubsub` into the InMemoryLRU fallback for destroy cleanup. That path is gone.

## What changed (vs `master`)

- `pubsub` constructor option removed
- Unsupported-driver fallback is `new InMemoryLRUCache()` with no pubsub

## How to migrate

Remove `pubsub` from `new LocalforageCache({ ... })` if you passed it.

#### Example
```ts
import LocalforageCache from '@graphql-mesh/cache-localforage'

// master: new LocalforageCache({ driver: [...], pubsub })
const cache = new LocalforageCache({ driver: ['INDEXEDDB', 'LOCALSTORAGE'] })
```
