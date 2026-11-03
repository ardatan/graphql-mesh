---
"@graphql-mesh/neo4j": major
---

- Require Node.js `>=22.18.0`
- Executor cleanup via `[DisposableSymbols.asyncDispose]`
- Use Hive `Logger` / `PubSub` from original packages
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
