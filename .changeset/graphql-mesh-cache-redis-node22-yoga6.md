---
"@graphql-mesh/cache-redis": major
---

- Require Node.js `>=22.18.0`
- Cleanup via `[DisposableSymbols.dispose]`; stop taking a `disposables` constructor option
- Use Hive `Logger` / `PubSub` types from original packages
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
#### Example
```ts
import RedisCache from '@graphql-mesh/cache-redis'
await using cache = new RedisCache({ host: '127.0.0.1' })
// Mesh/Gateway registers via disposables.use(cache); [DisposableSymbols.dispose] closes the client
```
