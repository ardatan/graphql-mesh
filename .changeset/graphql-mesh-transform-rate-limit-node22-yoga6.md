---
"@graphql-mesh/transform-rate-limit": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Rate-limit timeouts must clear on Mesh shutdown; implementing DisposableSymbols lets runtime dispose the transform without a destroy pubsub topic.

## What changed in this package

- Cleanup via `[DisposableSymbols.dispose]` for timeouts; `getMesh` registers disposable transforms with `disposables.use`

#### Example
```ts
import RateLimitTransform from '@graphql-mesh/transform-rate-limit'

const transform = new RateLimitTransform({
  config: [{ type: 'Query', field: 'users', max: 10, ttl: 60, identifier: '{context.headers.authorization}' }],
  ...meshTransformOptions,
})
disposables.use(transform)
```
