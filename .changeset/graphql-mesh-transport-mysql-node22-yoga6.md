---
"@graphql-mesh/transport-mysql": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

MySQL executors own pools; asyncDispose is the supported teardown path instead of destroy-pubsub.

## What changed in this package

- Executor exposes `[DisposableSymbols.asyncDispose]` for pool teardown
- Drop `@graphql-mesh/cross-helpers`; `util` via `globalThis.process?.getBuiltinModule` at call sites

#### Example
```ts
import { getMySQLExecutor } from '@graphql-mesh/transport-mysql'

await using executor = getMySQLExecutor({ subgraph, pool })
```
