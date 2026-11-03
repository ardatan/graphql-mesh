---
"@graphql-mesh/supergraph": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Align with Hive logger/pubsub and disposable Mesh lifecycle

#### Example
```ts
import SupergraphHandler from '@graphql-mesh/supergraph'

const handler = new SupergraphHandler({
  name: 'Supergraph',
  config: { source: './supergraph.graphql' },
  logger,
  pubsub,
})
```
