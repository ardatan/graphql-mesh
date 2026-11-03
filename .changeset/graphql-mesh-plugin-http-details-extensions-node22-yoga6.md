---
"@graphql-mesh/plugin-http-details-extensions": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment only; HTTP details extension plugin API unchanged beyond shared notes

#### Example
```ts
import useIncludeHttpDetailsInExtensions from '@graphql-mesh/plugin-http-details-extensions'
useIncludeHttpDetailsInExtensions({ if: () => true })
```
