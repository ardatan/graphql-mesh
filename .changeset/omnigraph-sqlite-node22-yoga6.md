---
"@omnigraph/sqlite": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop `@graphql-mesh/cross-helpers`; path via `globalThis.process?.getBuiltinModule`

#### Example
```ts
import { loadGraphQLSchemaFromSQLite } from '@omnigraph/sqlite'
const schema = await loadGraphQLSchemaFromSQLite('SQLite', { db: './data.db' })
```
