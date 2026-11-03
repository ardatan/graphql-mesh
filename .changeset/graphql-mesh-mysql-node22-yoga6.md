---
"@graphql-mesh/mysql": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Pool/executor cleanup via `[DisposableSymbols.asyncDispose]`; `getMesh` uses the handler on the stack
- Use Hive `PubSub` from `@graphql-hive/pubsub`

#### Example
```ts
import MySQLHandler from '@graphql-mesh/mysql'

await using handler = new MySQLHandler({
  name: 'MySQL',
  config: { host: '127.0.0.1', database: 'app', user: 'root' },
})
```
