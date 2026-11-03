---
"@omnigraph/grpc": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major vs `master` (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub -> disposables, builtins, promise helpers).

## Motivation

Invalid `includeDirs` used `return Promise.reject` on `master`. Throwing matches other Omnigraph loaders.

## What changed (vs `master`)

- Invalid `includeDirs` throws instead of `return Promise.reject`
- No cross-helpers; `getBuiltinModule` at call sites

## How to migrate

Prefer try/catch around `loadGraphQLSchemaFromGrpc`.

#### Example
```ts
import { loadGraphQLSchemaFromGrpc } from '@omnigraph/grpc'

const schema = await loadGraphQLSchemaFromGrpc('Grpc', {
  source: './service.proto',
  endpoint: 'localhost:50051',
})
```
