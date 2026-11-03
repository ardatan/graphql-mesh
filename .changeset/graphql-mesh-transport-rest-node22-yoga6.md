---
"@graphql-mesh/transport-rest": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment with Mesh transports / WHATWG promise-helpers; default transport export unchanged

#### Example
```ts
import restTransport from '@graphql-mesh/transport-rest'
// used by Hive Gateway / Mesh Fusion as the REST subgraph transport
```
