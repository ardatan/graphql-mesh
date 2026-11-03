---
"@graphql-mesh/transform-filter-schema": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Type-only globs like `!User` were ambiguous (type vs field) and silently meant different things across bare/wrap modes. Requiring the `Type.` prefix makes filter intent explicit and matches fusion composition.

## What changed in this package

- Type-only filter globs like `!User` throw; use `Type.!User`
- No Mesh destroy-pubsub / injected disposables in transform options (shared lifecycle model)

#### Example
```yaml
transforms:
  - filterSchema:
      filters:
        # Before: - '!User'   # no longer supported
        - Type.!User
        - Query.user.!pk
```
