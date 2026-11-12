---
"@graphql-mesh/transport-mysql": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

MySQL executors own pools; asyncDispose replaces destroy-pubsub teardown.

## What changed ()

- Executor `[DisposableSymbols.asyncDispose]` ends the pool

## How to migrate

Use `await using` around executors you construct in tests/custom hosts.

#### Example
```ts
import { getMySQLExecutor } from '@graphql-mesh/transport-mysql'

await using executor = getMySQLExecutor({ subgraph, pool })
```
