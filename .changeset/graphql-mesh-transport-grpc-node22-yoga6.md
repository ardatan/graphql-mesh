---
"@graphql-mesh/transport-grpc": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule`
- `GrpcTransportHelper` extends `DisposableStack`; transport cleanup goes through `[DisposableSymbols.dispose]`

#### Example
```ts
import { GrpcTransportHelper } from '@graphql-mesh/transport-grpc'
import { DisposableSymbols } from '@whatwg-node/disposablestack'

const helper = new GrpcTransportHelper({ /* credentials, endpoint, … */ })
disposables.use(helper) // helper[DisposableSymbols.dispose]()
```
