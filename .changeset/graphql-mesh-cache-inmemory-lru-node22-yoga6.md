---
"@graphql-mesh/cache-inmemory-lru": major
---

- Require Node.js `>=22.18.0`
- Cleanup via `[DisposableSymbols.dispose]` so Mesh/Gateway can `disposables.use(cache)`
- Depend on `@whatwg-node/disposablestack` directly
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
