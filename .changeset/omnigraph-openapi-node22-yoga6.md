---
"@omnigraph/openapi": major
---

- Require Node.js `>=22.18.0`
- Use `@graphql-hive/logger` directly; declare the dependency
- Drop Mesh cross-helpers / logger re-exports
- Remove global `futureLinks` export; HATEOAS link state stays on `HATEOASContext` (or a local set)
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
