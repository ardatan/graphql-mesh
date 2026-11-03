---
"@graphql-mesh/cache-inmemory-lru": major
---

- Require Node.js `>=22.18.0`
- Cleanup via `[DisposableSymbols.dispose]` so Mesh/Gateway can `disposables.use(cache)`
- Depend on `@whatwg-node/disposablestack` directly
