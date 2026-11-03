---
"@graphql-mesh/plugin-operation-field-permissions": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Platform alignment only; field permissions plugin API unchanged beyond shared notes

#### Example
```ts
import useMeshOperationFieldPermissions from '@graphql-mesh/plugin-operation-field-permissions'
useMeshOperationFieldPermissions({ ...meshPluginOptions, permissions: ['Query.*'] })
```
