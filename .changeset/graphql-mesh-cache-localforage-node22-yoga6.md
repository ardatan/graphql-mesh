---
"@graphql-mesh/cache-localforage": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Align with disposable cache lifecycle; drop unused `pubsub` constructor option (fallback `InMemoryLRUCache` no longer needs it)

#### Example
```ts
import LocalforageCache from '@graphql-mesh/cache-localforage'

// Before: new LocalforageCache({ ..., pubsub })
const cache = new LocalforageCache()
disposables.use(cache)
```
