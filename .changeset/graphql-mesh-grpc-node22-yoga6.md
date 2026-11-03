---
"@graphql-mesh/grpc": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Handler owns `GrpcTransportHelper` and cleans up via `[DisposableSymbols.dispose]`; `getMesh` registers with `disposables.use(handler)` (no injected `disposables` option)
- Use Hive `Logger` / `PubSub` from original packages

#### Example
```ts
import GrpcHandler from '@graphql-mesh/grpc'

const handler = new GrpcHandler({
  name: 'MyGrpc',
  config: { source: './service.proto', endpoint: 'localhost:50051' },
  // no disposables option — implement DisposableSymbols on the handler
})
// getMesh: disposables.use(handler)
```
