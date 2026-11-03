---
"@graphql-mesh/transport-thrift": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Async request path throws instead of `return Promise.reject(...)`

#### Example
```ts
import { getThriftExecutor } from '@graphql-mesh/transport-thrift'
const executor = getThriftExecutor({ ... })
// failed connection now throws / rejects via exception path, not Promise.reject return
```
