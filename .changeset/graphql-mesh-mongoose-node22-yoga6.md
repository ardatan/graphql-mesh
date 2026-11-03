---
"@graphql-mesh/mongoose": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Disconnect via `[DisposableSymbols.asyncDispose]`; stop relying on `disposables.defer` / destroy pubsub
- Use Hive `Logger` / `PubSub` from original packages

#### Example
```ts
import MongooseHandler from '@graphql-mesh/mongoose'

const handler = new MongooseHandler({ name: 'Mongoose', config: { connectionString: mongoUrl, models: [...] } })
// await handler[DisposableSymbols.asyncDispose]() closes mongoose connections
```
