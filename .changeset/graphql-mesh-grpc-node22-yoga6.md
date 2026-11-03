---
"@graphql-mesh/grpc": major
---

- Require Node.js `>=22.18.0`
- Handler owns `GrpcTransportHelper` and cleans up via `[DisposableSymbols.dispose]`; `getMesh` registers with `disposables.use(handler)`
- Use Hive `Logger` / `PubSub` from original packages
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
