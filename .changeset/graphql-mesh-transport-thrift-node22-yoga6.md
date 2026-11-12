---
"@graphql-mesh/transport-thrift": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

`return Promise.reject(err)` inside async functions loses stacks. Throwing matches other Mesh transports.

## What changed ()

- Async request path throws instead of `return Promise.reject(...)`

## How to migrate

Update tests that asserted on returned rejected promises; use try/catch or `.rejects`.

#### Example
```ts
import { getThriftExecutor } from '@graphql-mesh/transport-thrift'

const executor = getThriftExecutor(subgraph)
```
