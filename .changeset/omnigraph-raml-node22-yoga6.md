---
"@omnigraph/raml": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment with Omnigraph OpenAPI/JSON Schema majors; loader API unchanged beyond shared notes

#### Example
```ts
import { loadNonExecutableGraphQLSchemaFromRAML } from '@omnigraph/raml'
const schema = await loadNonExecutableGraphQLSchemaFromRAML('RAML', { source: './api.raml' })
```
