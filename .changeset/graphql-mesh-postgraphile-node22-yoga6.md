---
"@graphql-mesh/postgraphile": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Pool cleanup via `[DisposableSymbols.asyncDispose]`
- Node `path` via `globalThis.process?.getBuiltinModule` at use site
- Use Hive `Logger` / `PubSub` from original packages

#### Example
```ts
import PostGraphileHandler from '@graphql-mesh/postgraphile'

const handler = new PostGraphileHandler({
  name: 'Pg',
  config: { connectionString: process.env.DATABASE_URL },
})
disposables.use(handler) // ends the pg pool
```
