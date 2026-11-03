---
"@omnigraph/openapi": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Module-level `futureLinks` shared HATEOAS link state across loads — tests polluted each other and concurrent `load*` calls could see each other’s links. Link tracking is now scoped to the load/context (`HATEOASContext` / local set).

## What changed

- Global `futureLinks` export removed
- Hive `Logger` dependency; no Mesh cross-helpers / logger re-exports

## How to migrate

1. Delete imports of `futureLinks` from `@omnigraph/openapi`.
2. If you relied on inspecting that set, hook link state through your load options/context instead.

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
