---
"@graphql-mesh/graphql": major
---

- Require Node.js `>=22.18.0`
- Use Hive `Logger` / `PubSub` from original packages; drop Mesh logger/pubsub re-exports
- Node builtins via `globalThis.process?.getBuiltinModule`
