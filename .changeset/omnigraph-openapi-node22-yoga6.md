---
"@omnigraph/openapi": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

A module-level `futureLinks` set leaked HATEOAS link state across loads/tests and prevented concurrent OpenAPI loads from isolating link tracking. Link state belongs to the load/context.

## What changed in this package

- Remove global `futureLinks` export; HATEOAS link state stays on `HATEOASContext` (or a local set)
- Use `@graphql-hive/logger` directly; drop Mesh cross-helpers / logger re-exports

#### Example
```ts
import { loadNonExecutableGraphQLSchemaFromOpenAPI } from '@omnigraph/openapi'
import { Logger } from '@graphql-hive/logger'

// Before: import { futureLinks } from '@omnigraph/openapi'
const schema = await loadNonExecutableGraphQLSchemaFromOpenAPI('API', {
  source: './openapi.yaml',
  logger: new Logger(),
})
```
