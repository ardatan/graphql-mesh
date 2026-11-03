---
"@graphql-mesh/transport-neo4j": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Wrapping every `pubsub.publish` in `fakePromise` added microtasks without benefit and `once` handlers could double-fire. Driver close belongs on asyncDispose with Hive PubSub used directly.

## What changed

- `pubsub.publish` called directly; `once` guarded against double delivery
- Hive `PubSub` from `@graphql-hive/pubsub`
- Executor `[DisposableSymbols.asyncDispose]` closes the driver

## How to migrate

Pass a Hive PubSub into the executor; dispose via `await using` / Gateway stack.

#### Example
```ts
import { getNeo4JExecutor } from '@graphql-mesh/transport-neo4j'
import type { PubSub } from '@graphql-hive/pubsub'

await using executor = await getNeo4JExecutor({ driver, pubsub })
```
