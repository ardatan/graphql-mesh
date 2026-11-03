---
"@graphql-mesh/http": major
---

- Require Node.js `>=22.18.0`
- Use Hive `Logger` typing; webhook `pubsub.publish` without unnecessary `await`
- Node builtins via `globalThis.process?.getBuiltinModule`
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
