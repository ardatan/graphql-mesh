---
"@graphql-mesh/transform-filter-schema": major
---

- Require Node.js `>=22.18.0`
- Align with Mesh types / utils majors (Hive logger-pubsub option typing, no Mesh destroy pubsub)
- Type-only filter globs like `!User` are removed; use `Type.!User` (#1605)
- `peerDependencies.graphql` set to `^16.0.0 || ^17.0.0` (Yoga 6 / `@graphql-tools/utils` / `schema` / `merge` / `executor`)

#### Example
```yaml
transforms:
  - filterSchema:
      filters:
        - Type.!User
        - Query.user.!pk
```
