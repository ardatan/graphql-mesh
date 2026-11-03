---
"@graphql-mesh/transport-grpc": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

gRPC transport helpers hold channels that must close with the subgraph executor. Extending DisposableStack makes Gateway/Mesh disposal uniform.

## What changed in this package

- `GrpcTransportHelper` extends `DisposableStack` / exposes `[DisposableSymbols.dispose]`
- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule` at call sites

#### Example
```ts
import { GrpcTransportHelper } from '@graphql-mesh/transport-grpc'

const helper = new GrpcTransportHelper({ /* endpoint, credentials */ })
disposables.use(helper)
```
