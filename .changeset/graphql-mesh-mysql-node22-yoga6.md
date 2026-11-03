---
"@graphql-mesh/mysql": major
---

- Require Node.js `>=22.18.0`
- Pool/executor cleanup via `[DisposableSymbols.asyncDispose]`; `getMesh` uses the handler on the stack
- Use Hive `PubSub` from `@graphql-hive/pubsub`
