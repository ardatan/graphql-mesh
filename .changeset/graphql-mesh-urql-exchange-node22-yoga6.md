---
"@graphql-mesh/urql-exchange": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Align with Mesh utils / WHATWG promise-helpers majors; exchange API unchanged beyond shared platform notes

#### Example
```ts
import { meshExchange } from '@graphql-mesh/urql-exchange'
import { createClient } from '@urql/core'

const client = createClient({
  url: '/graphql',
  exchanges: [meshExchange({ mesh })],
})
```
