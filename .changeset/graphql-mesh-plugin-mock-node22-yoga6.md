---
"@graphql-mesh/plugin-mock": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment only; mock plugin API unchanged beyond shared notes

#### Example
```ts
import { useMock } from '@graphql-mesh/plugin-mock'
useMock({ ...meshPluginOptions, mocks: { User: () => ({ id: '1' }) } })
```
