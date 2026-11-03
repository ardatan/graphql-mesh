---
"@graphql-mesh/transport-neo4j": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Neo4j event bridging no longer wraps every `pubsub.publish` in `fakePromise` (unnecessary microtasks) and must not double-deliver `once` handlers. Driver close is asyncDispose.

## What changed in this package

- Call `pubsub.publish` directly; guard `once` against double delivery
- Use Hive `PubSub` from `@graphql-hive/pubsub`
- Executor exposes `[DisposableSymbols.asyncDispose]` for driver close

#### Example
```ts
import { getNeo4JExecutor } from '@graphql-mesh/transport-neo4j'
import type { PubSub } from '@graphql-hive/pubsub'

await using executor = await getNeo4JExecutor({ driver, pubsub })
```
