---
"@graphql-mesh/transform-rate-limit": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Rate-limit windows use timers that must clear on shutdown. DisposableSymbols hooks the transform into Mesh’s stack instead of a destroy pubsub topic that custom hosts often never fired.

## What changed

- `[DisposableSymbols.dispose]` clears timeouts; `getMesh` uses `disposables.use(transform)`

## How to migrate

No config change — shut Mesh/Gateway down via dispose so timers are cleared.

#### Example
```ts
import RateLimitTransform from '@graphql-mesh/transform-rate-limit'

const transform = new RateLimitTransform({
  config: [{ type: 'Query', field: 'users', max: 10, ttl: 60, identifier: '{context.headers.authorization}' }],
  ...meshTransformOptions,
})
disposables.use(transform)
```
