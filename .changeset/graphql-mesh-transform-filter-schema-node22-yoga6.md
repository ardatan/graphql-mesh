---
"@graphql-mesh/transform-filter-schema": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, builtins, promise helpers).

## Motivation

type-only globs like `!User` were accepted but ambiguous across bare/wrap modes. This major requires an explicit `Type.` prefix so filters fail loudly and match fusion composition.

## What changed ()

- Type-only filters like `!User` throw; use `Type.!User`

## How to migrate

Search configs for filters that start with `!` without a `Type.` / field path prefix and rewrite type removals as `Type.!TypeName`.

#### Example
```yaml
transforms:
 - filterSchema:
 filters:
 # previously allowed: - '!User'
 - Type.!User
 - Query.user.!pk
```
