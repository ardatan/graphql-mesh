---
"@graphql-mesh/transport-neo4j": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

Avoid unnecessary `fakePromise` around `pubsub.publish`, guard `once` against double delivery, and close the driver via asyncDispose with Hive PubSub.

## What changed ()

- `pubsub.publish` called directly; `once` guarded against double delivery
- Hive `PubSub` from `@graphql-hive/pubsub`
- Executor `[DisposableSymbols.asyncDispose]` closes the driver

## How to migrate

Pass Hive PubSub; dispose via `await using` / Gateway stack.

#### Example
```ts
import { getNeo4JExecutor } from '@graphql-mesh/transport-neo4j'
import type { PubSub } from '@graphql-hive/pubsub'

await using executor = await getNeo4JExecutor({ driver, pubsub })
```
