---
"@graphql-mesh/transport-thrift": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

`return Promise.reject(err)` inside `async` functions loses stacks and confuses callers that `try/catch` around `await`. Throwing matches other Mesh transports.

## What changed

- Async request path throws instead of `return Promise.reject(...)`

## How to migrate

Update tests/custom wrappers that asserted on returned rejected promises; use try/catch or `.rejects` on the async call.

#### Example
```ts
import { getThriftExecutor } from '@graphql-mesh/transport-thrift'

const executor = getThriftExecutor(subgraph)
// failures surface as thrown/rejected async errors, not Promise.reject returns
```
