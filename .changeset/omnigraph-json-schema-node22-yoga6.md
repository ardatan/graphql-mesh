---
"@omnigraph/json-schema": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Use `@graphql-hive/logger` directly; declare the dependency
- Drop Mesh cross-helpers / logger re-exports

#### Example
```ts
import { loadNonExecutableGraphQLSchemaFromJSONSchemas } from '@omnigraph/json-schema'
import { Logger } from '@graphql-hive/logger'

const schema = await loadNonExecutableGraphQLSchemaFromJSONSchemas('API', {
  source: './schema.json',
  logger: new Logger(),
})
```
