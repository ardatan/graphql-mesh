---
"@graphql-mesh/cache-inmemory-lru": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Cleanup via `[DisposableSymbols.dispose]` so Mesh/Gateway can `disposables.use(cache)`
- Depend on `@whatwg-node/disposablestack` directly

#### Example
```ts
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru'
import { DisposableSymbols } from '@whatwg-node/disposablestack'

const cache = new InMemoryLRUCache()
disposables.use(cache) // calls cache[DisposableSymbols.dispose]()
```
