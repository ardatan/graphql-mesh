---
"@omnigraph/sqlite": major
---

- Require Node.js `>=22.18.0`
- Drop `@graphql-mesh/cross-helpers`; path via `globalThis.process?.getBuiltinModule`
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
