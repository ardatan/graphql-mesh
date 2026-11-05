---
"@omnigraph/openapi": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

The public module-level `futureLinks` export leaked HATEOAS link state into
callers and tests. Prefer an explicit `HATEOASContext` (or
`getJSONSchemaOptionsFromMultipleOpenAPIOptions`). Compose still uses a
non-exported process-local fallback when subgraphs load independently so
cross-subgraph HATEOAS links keep working.

## What changed ()

- Global `futureLinks` export removed (no public shared Set)
- Hive `Logger` dependency; no Mesh logger re-exports

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
