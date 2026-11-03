---
"@graphql-mesh/transport-grpc": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major vs `master` (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub -> disposables, builtins, promise helpers).

## Motivation

gRPC helpers hold channels that must close with the subgraph executor. Disposal goes through `[DisposableSymbols.dispose]` instead of destroy-pubsub.

## What changed (vs `master`)

- `GrpcTransportHelper` / transport cleanup via `[DisposableSymbols.dispose]`
- No `@graphql-mesh/cross-helpers`; `getBuiltinModule` at call sites

## How to migrate

If you construct helpers manually, `disposables.use(helper)`.

#### Example
```ts
import { GrpcTransportHelper } from '@graphql-mesh/transport-grpc'

const helper = new GrpcTransportHelper({ /* endpoint, credentials */ })
disposables.use(helper)
```
