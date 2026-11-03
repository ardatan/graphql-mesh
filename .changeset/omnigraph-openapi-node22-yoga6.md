---
"@omnigraph/openapi": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, builtins, promise helpers).

## Motivation

module-level `futureLinks` shared HATEOAS link state across loads (test pollution / concurrent loads). Link tracking is now scoped to the load/context.

## What changed ()

- Global `futureLinks` export removed
- Hive `Logger` dependency; no Mesh cross-helpers / logger re-exports

## How to migrate

Delete imports of `futureLinks` from `@omnigraph/openapi`. Use load options/context if you need link state.

#### Example
```ts
import { loadNonExecutableGraphQLSchemaFromOpenAPI } from '@omnigraph/openapi'
import { Logger } from '@graphql-hive/logger'

// before: import { futureLinks } from '@omnigraph/openapi'
const schema = await loadNonExecutableGraphQLSchemaFromOpenAPI('API', {
 source: './openapi.yaml',
 logger: new Logger(),
})
```
