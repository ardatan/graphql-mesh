---
"@graphql-mesh/transport-mysql": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major vs `master` (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub -> disposables, builtins, promise helpers).

## Motivation

MySQL executors own pools; asyncDispose replaces destroy-pubsub teardown.

## What changed (vs `master`)

- Executor `[DisposableSymbols.asyncDispose]` ends the pool
- No cross-helpers; `util` via `getBuiltinModule` at call sites

## How to migrate

Use `await using` around executors you construct in tests/custom hosts.

#### Example
```ts
import { getMySQLExecutor } from '@graphql-mesh/transport-mysql'

await using executor = getMySQLExecutor({ subgraph, pool })
```
