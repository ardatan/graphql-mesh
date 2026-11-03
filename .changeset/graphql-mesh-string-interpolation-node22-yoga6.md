---
"@graphql-mesh/string-interpolation": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment only (Node 22+ / GraphQL peer); interpolation API unchanged

#### Example
```ts
import { getInterpolatedStringFactory } from '@graphql-mesh/string-interpolation'
const factory = getInterpolatedStringFactory('Bearer {context.headers.authorization}')
```
