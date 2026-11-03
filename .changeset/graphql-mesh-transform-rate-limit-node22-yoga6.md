---
"@graphql-mesh/transform-rate-limit": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Cleanup via `[DisposableSymbols.dispose]` for timeouts; `getMesh` registers disposable transforms with `disposables.use`

#### Example
```ts
import RateLimitTransform from '@graphql-mesh/transform-rate-limit'

const transform = new RateLimitTransform({
  config: [{ type: 'Query', field: 'users', max: 10, ttl: 60, identifier: '{context.headers.authorization}' }],
})
disposables.use(transform)
```
