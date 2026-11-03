---
"@graphql-mesh/mongoose": major
---

- Require Node.js `>=22.18.0`
- Disconnect via `[DisposableSymbols.asyncDispose]`; stop relying on `disposables.defer` / destroy pubsub
- Use Hive `Logger` / `PubSub` from original packages
