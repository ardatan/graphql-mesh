---
"@graphql-mesh/plugin-deduplicate-request": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment only; dedupe plugin API unchanged beyond shared notes

#### Example
```ts
import useDeduplicateRequest from '@graphql-mesh/plugin-deduplicate-request'
useDeduplicateRequest()
```
