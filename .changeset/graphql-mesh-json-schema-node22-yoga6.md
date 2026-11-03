---
"@graphql-mesh/json-schema": major
---

- Require Node.js `>=22.18.0`
- Use Hive `Logger` / `PubSub` from original packages; drop Mesh re-exports / cross-helpers
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
