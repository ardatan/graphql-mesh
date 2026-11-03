---
"json-machete": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment only (Node 22+); JSON Schema pointer helpers unchanged

#### Example
```ts
import { healJSONSchema } from 'json-machete'
const healed = await healJSONSchema(schema)
```
