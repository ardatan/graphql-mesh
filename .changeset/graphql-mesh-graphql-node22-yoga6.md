---
"@graphql-mesh/graphql": major
---

- Require Node.js `>=22.18.0`
- Use Hive `Logger` / `PubSub` from original packages; drop Mesh logger/pubsub re-exports
- Node builtins via `globalThis.process?.getBuiltinModule`
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
