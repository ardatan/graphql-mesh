---
"@graphql-mesh/transport-mysql": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

MySQL executors own pools; asyncDispose is the supported teardown path so Gateway workers can recycle subgraphs without leaking connections.

## What changed

- Executor `[DisposableSymbols.asyncDispose]` ends the pool
- No cross-helpers; `util` via `getBuiltinModule` at call sites

## How to migrate

Use `await using` around executors you construct in tests/custom hosts.

#### Example
```ts
import { getMySQLExecutor } from '@graphql-mesh/transport-mysql'

await using executor = getMySQLExecutor({ subgraph, pool })
```
