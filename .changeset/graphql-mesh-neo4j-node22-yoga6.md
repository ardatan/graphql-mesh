---
"@graphql-mesh/neo4j": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Handlers previously expected Mesh to inject disposables or to publish destroy so Neo4j drivers could close. That leaked when destroy subscribers were missing. The handler now owns teardown via `[DisposableSymbols.asyncDispose]`.

## What changed in this package

- Cleanup Neo4j drivers via `[DisposableSymbols.asyncDispose]`; `getMesh` registers with `disposables.use(handler)`
- No injected `disposables` constructor option
- Use Hive `Logger` / `PubSub` types from their packages

#### Example
```ts
import Handler from '@graphql-mesh/neo4j'

const handler = new Handler({
  name: 'API',
  config: { /* source-specific */ },
  // Before: { disposables } or destroy-pubsub subscription
})
disposables.use(handler)
```
