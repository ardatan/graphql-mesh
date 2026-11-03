---
"@omnigraph/mysql": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Lazy `globalThis.process?.getBuiltinModule` accessors for fs/util at call sites (test-mock friendly, non-Node safe)

#### Example
```ts
import { loadGraphQLSchemaFromMySQL } from '@omnigraph/mysql'

const schema = await loadGraphQLSchemaFromMySQL('MySQL', {
  host: '127.0.0.1',
  database: 'app',
  user: 'root',
})
```
