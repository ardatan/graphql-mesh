---
"@graphql-mesh/tuql": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Align with Mesh handler / types majors for Node 22+

#### Example
```ts
import TuqlHandler from '@graphql-mesh/tuql'

const handler = new TuqlHandler({
  name: 'SQLite',
  config: { db: './data.db' },
})
```
