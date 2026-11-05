---
"@graphql-mesh/neo4j": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

this handler cleaned up Neo4j drivers by subscribing to Mesh `destroy` pubsub. There was no `disposables` constructor option. Destroy-pubsub is removed, so the handler implements `[DisposableSymbols.asyncDispose]` and `getMesh` registers it with `disposables.use(handler)`.

## What changed ()

- Tear down Neo4j drivers via `[DisposableSymbols.asyncDispose]` instead of a `destroy` pubsub subscriber
- Hive `Logger` / `PubSub` types; option naming uses `log`

## How to migrate

1. Stop relying on destroy-pubsub subscribers for connection cleanup.
2. Pass the handler through `getMesh` (it calls `disposables.use`) or register dispose yourself.
3. Rename `logger` to `log` if you construct the handler manually.

#### Example
```ts
import Handler from '@graphql-mesh/neo4j'

const handler = new Handler({
 name: 'API',
 config: { /* source-specific */ },
 // before: subscribed to pubsub 'destroy'; no disposables ctor option then or now
})
disposables.use(handler)
```
