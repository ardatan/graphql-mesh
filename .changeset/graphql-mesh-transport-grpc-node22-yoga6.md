---
"@graphql-mesh/transport-grpc": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

gRPC helpers hold channels that outlive a single request. Making `GrpcTransportHelper` a DisposableStack participant means Gateway subgraph shutdown closes channels deterministically.

## What changed

- `GrpcTransportHelper` / transport cleanup via `[DisposableSymbols.dispose]`
- No `@graphql-mesh/cross-helpers`; `getBuiltinModule` at call sites

## How to migrate

If you construct helpers manually, `disposables.use(helper)`. Prefer letting the transport factory register dispose with the executor host.

#### Example
```ts
import { GrpcTransportHelper } from '@graphql-mesh/transport-grpc'

const helper = new GrpcTransportHelper({ /* endpoint, credentials */ })
disposables.use(helper)
```
