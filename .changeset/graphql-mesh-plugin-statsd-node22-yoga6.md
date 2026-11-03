---
"@graphql-mesh/plugin-statsd": major
---

- Require Node.js `>=22.18.0`
- Cleanup via `[DisposableSymbols.asyncDispose]` for the StatsD client
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
