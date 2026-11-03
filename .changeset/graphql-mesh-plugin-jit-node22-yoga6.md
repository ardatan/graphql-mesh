---
"@graphql-mesh/plugin-jit": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment only; JIT plugin API unchanged beyond shared notes

#### Example
```ts
import { useJIT } from '@graphql-mesh/plugin-jit'
useJIT()
```
