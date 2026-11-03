---
"@omnigraph/grpc": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Invalid `includeDirs` used `return Promise.reject`, which is awkward at call sites and inconsistent with other Omnigraph loaders that throw. Failing loudly simplifies loader composition.

## What changed

- Invalid `includeDirs` throws instead of `return Promise.reject`
- No cross-helpers; `getBuiltinModule` at call sites

## How to migrate

Prefer try/catch around `loadGraphQLSchemaFromGrpc`; update tests expecting a returned rejected promise.

#### Example
```ts
import { loadGraphQLSchemaFromGrpc } from '@omnigraph/grpc'

const schema = await loadGraphQLSchemaFromGrpc('Grpc', {
  source: './service.proto',
  endpoint: 'localhost:50051',
})
```
