---
"@omnigraph/grpc": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

Invalid `includeDirs` used `return Promise.reject` . Throwing matches other Omnigraph loaders.

## What changed ()

- Invalid `includeDirs` throws instead of `return Promise.reject`

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
