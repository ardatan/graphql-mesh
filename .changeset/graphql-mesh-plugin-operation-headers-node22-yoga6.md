---
"@graphql-mesh/plugin-operation-headers": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment only; operation headers plugin API unchanged beyond shared notes

#### Example
```ts
import { useOperationHeaders } from '@graphql-mesh/plugin-operation-headers'
useOperationHeaders(({ context }) => ({
  'x-api-key': context.headers['x-api-key'],
}))
```
