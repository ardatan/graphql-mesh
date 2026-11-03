---
"@omnigraph/grpc": major
---

- Require Node.js `>=22.18.0`
- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule`
- Throw instead of `Promise.reject` for invalid `includeDirs`
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)
