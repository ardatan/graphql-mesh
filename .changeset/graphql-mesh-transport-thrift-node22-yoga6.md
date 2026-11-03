---
"@graphql-mesh/transport-thrift": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Returning `Promise.reject(...)` from an async function is an anti-pattern that hides stacks. Thrift transport now throws so failures surface consistently with other transports.

## What changed in this package

- Async request path throws instead of `return Promise.reject(...)`

#### Example
```ts
import { getThriftExecutor } from '@graphql-mesh/transport-thrift'

const executor = getThriftExecutor(subgraph)
// connection failures reject via thrown errors, not Promise.reject returns
```
