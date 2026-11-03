---
"@graphql-mesh/grpc": major
---

- Require Node.js `>=22.18.0`
- Handler cleanup via `[DisposableSymbols.asyncDispose]` (transport dispose); `getMesh` registers with `disposables.use(handler)`
- Use Hive `Logger` / `PubSub` from original packages
