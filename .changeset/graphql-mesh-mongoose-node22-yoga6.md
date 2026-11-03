---
"@graphql-mesh/mongoose": major
---

- Require Node.js `>=22.18.0`
- Disconnect via `[DisposableSymbols.asyncDispose]`; stop relying on `disposables.defer` / destroy pubsub
- Use Hive `Logger` / `PubSub` from original packages
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
