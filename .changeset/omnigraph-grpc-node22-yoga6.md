---
"@omnigraph/grpc": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule`
- Throw instead of `Promise.reject` for invalid `includeDirs`

#### Example
```ts
import { loadGraphQLSchemaFromGrpc } from '@omnigraph/grpc'

// invalid includeDirs now throws synchronously / via rejected load, not `return Promise.reject`
const schema = await loadGraphQLSchemaFromGrpc('Grpc', {
  source: './service.proto',
  endpoint: 'localhost:50051',
})
```
