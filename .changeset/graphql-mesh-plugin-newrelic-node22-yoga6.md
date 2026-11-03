---
"@graphql-mesh/plugin-newrelic": major
---

- Require Node.js `>=22.18.0`
- Use `MeshPluginOptions` without a dedicated `log` field; align envelop/Yoga 6 majors
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
