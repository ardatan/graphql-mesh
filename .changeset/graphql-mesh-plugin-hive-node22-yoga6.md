---
"@graphql-mesh/plugin-hive": major
---

- Require Node.js `>=22.18.0`
- No Mesh `log` plugin option; Hive agent logger comes from `agent.logger` when set
- Align with `@graphql-hive/yoga` / Yoga 6
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
