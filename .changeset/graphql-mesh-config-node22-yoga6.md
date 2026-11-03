---
"@graphql-mesh/config": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Config generation used to thread `pubsub` into every cache constructor for destroy cleanup, and could inject disposables into factories. Caches no longer listen to destroy-pubsub, so config must stop fabricating that coupling.

## What changed in this package

- Create shared lifecycle expectations for Mesh; do not inject `disposables` into handlers / transforms / mergers / plugins
- Pass optional `log` into plugin factories for init-time diagnostics; request-time logging still prefers Yoga/Gateway `context.log`
- `resolveCache` no longer injects `pubsub` into cache constructors (only `log` / store / importFn)
- Resolve logger / pubsub from `@graphql-hive/logger` and `@graphql-hive/pubsub`

#### Example
```ts
import { findAndParseConfig } from '@graphql-mesh/config'
import { getMesh } from '@graphql-mesh/runtime'

const config = await findAndParseConfig()
// Before: MeshCache({ ..., pubsub, disposables })
const mesh = await getMesh(config)
await using _ = mesh
```
