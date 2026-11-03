---
"@omnigraph/openapi": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Use `@graphql-hive/logger` directly; declare the dependency
- Drop Mesh cross-helpers / logger re-exports
- Remove global `futureLinks` export; HATEOAS link state stays on `HATEOASContext` (or a local set)

#### Example
```ts
import { loadNonExecutableGraphQLSchemaFromOpenAPI } from '@omnigraph/openapi'
import { Logger } from '@graphql-hive/logger'

const schema = await loadNonExecutableGraphQLSchemaFromOpenAPI('API', {
  source: './openapi.yaml',
  logger: new Logger(),
  // futureLinks is no longer a module-level export — link tracking is per load/context
})
```
