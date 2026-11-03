---
"@omnigraph/odata": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment with Omnigraph / Hive logger majors; loader API unchanged beyond shared notes

#### Example
```ts
import { loadGraphQLSchemaFromOData } from '@omnigraph/odata'
const schema = await loadGraphQLSchemaFromOData('OData', { baseUrl: 'https://services.odata.org/V4/…' })
```
