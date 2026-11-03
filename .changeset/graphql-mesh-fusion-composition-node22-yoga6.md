---
"@graphql-mesh/fusion-composition": major
---

- Require Node.js `>=22.18.0`
- Type-only filter globs like `!User` are removed from `createFilterTransform`; use `Type.!User` (#1605)
- `peerDependencies.graphql` tightened to `^16.0.0 || ^17.0.0` (aligned with `@graphql-tools/utils` / `schema`)
