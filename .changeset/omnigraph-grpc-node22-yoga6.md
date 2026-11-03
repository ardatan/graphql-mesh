---
"@omnigraph/grpc": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Invalid `includeDirs` used `return Promise.reject`, which is hard to catch at the call site. Throwing (or rejecting the load promise normally) matches other loaders.

## What changed in this package

- Throw instead of `return Promise.reject` for invalid `includeDirs`
- Drop `@graphql-mesh/cross-helpers`; use `globalThis.process?.getBuiltinModule` at call sites

#### Example
```ts
import { loadGraphQLSchemaFromGrpc } from '@omnigraph/grpc'

const schema = await loadGraphQLSchemaFromGrpc('Grpc', {
  source: './service.proto',
  endpoint: 'localhost:50051',
  // invalid includeDirs now fails loudly via throw / rejected load
})
```
