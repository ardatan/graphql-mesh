---
"@graphql-mesh/transform-filter-schema": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Type-only filter globs like `!User` are removed; use `Type.!User`
- Align with Mesh types / utils majors (Hive logger-pubsub option typing, no Mesh destroy pubsub)

#### Example
```yaml
transforms:
  - filterSchema:
      filters:
        # Before: - '!User'
        - Type.!User
        - Query.user.!pk
```
