---
"@graphql-mesh/merger-stitching": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Use Hive `Logger` / `PubSub` option types from Mesh config (no injected `disposables`)

#### Example
```ts
import StitchingMerger from '@graphql-mesh/merger-stitching'
const merger = new StitchingMerger({ logger, pubsub })
```
