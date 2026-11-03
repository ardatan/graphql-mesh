---
"@graphql-mesh/transform-filter-schema": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Bare type globs such as `!User` looked convenient but were ambiguous (drop a type vs drop fields?) and diverged between bare and wrap modes. For a breaking major we require an explicit `Type.` prefix so compose-time and runtime filters mean the same thing — and so misconfigured filters fail loudly instead of silently dropping the wrong schema parts.

## What changed

- Type-only filters like `!User` throw: use `Type.!User`
- Transform options follow the shared model (no destroy-pubsub / injected disposables)

## How to migrate

1. Search `.meshrc` / compose configs for filter entries that start with `!` without a `Type.` / `Query.` / field path prefix.
2. Rewrite type removals as `Type.!TypeName`.
3. Keep field filters as `TypeName.field` / `TypeName.field.!arg` as before.

#### Example
```yaml
transforms:
  - filterSchema:
      filters:
        # Before (throws): - '!User'
        - Type.!User
        - Query.user.!pk
```
