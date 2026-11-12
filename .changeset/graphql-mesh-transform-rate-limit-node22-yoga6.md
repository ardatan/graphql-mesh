---
"@graphql-mesh/transform-rate-limit": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

Rate-limit timers need a clear shutdown path after destroy-pubsub is gone. The transform implements `[DisposableSymbols.dispose]` so `getMesh` can register it.

## What changed ()

- `[DisposableSymbols.dispose]` clears timeouts; `getMesh` uses `disposables.use(transform)`

## How to migrate

No YAML change. Shut Mesh/Gateway down via dispose so timers clear.

#### Example
```ts
import RateLimitTransform from '@graphql-mesh/transform-rate-limit'

const transform = new RateLimitTransform({
 config: [{ type: 'Query', field: 'users', max: 10, ttl: 60, identifier: '{context.headers.authorization}' }],
 ...meshTransformOptions,
})
disposables.use(transform)
```
