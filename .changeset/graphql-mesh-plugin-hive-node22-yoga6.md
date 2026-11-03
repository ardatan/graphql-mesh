---
"@graphql-mesh/plugin-hive": major
---

- Require Node.js `>=22.18.0`
- Align with `@graphql-hive/yoga` / Yoga 6; rely on `useHive`'s Yoga `onDispose` / Hive `autoDispose` for client cleanup (no extra Mesh `[DisposableSymbols]` wrapper)
- Drop unused plugin `pubsub` option (Hive does not need Mesh/Gateway pubsub)
- Hive agent logger comes from `agent.logger` when set
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
