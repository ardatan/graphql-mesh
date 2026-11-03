---
"@graphql-mesh/config": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

Generated/processed config used to pass `pubsub` into every cache constructor so caches could subscribe to `destroy`, and could thread disposables into factories. After caches moved to `[DisposableSymbols]` and stopped taking `pubsub`, config had to drop that coupling or it would keep generating dead options forever.

## What changed

- Do not inject `disposables` into handlers / transforms / mergers / plugins
- Optional `log` for plugin factories (init-time only)
- `resolveCache` no longer passes `pubsub` into cache constructors
- Logger/pubsub resolved from `@graphql-hive/logger` / `@graphql-hive/pubsub`

## How to migrate

1. Regenerate Mesh artifacts / re-run config processing after upgrade.
2. Remove any hand-written `pubsub` / `disposables` fields passed into cache constructors in custom config code.

#### Example
```ts
import { findAndParseConfig } from '@graphql-mesh/config'
import { getMesh } from '@graphql-mesh/runtime'

const config = await findAndParseConfig()
// Before: MeshCache({ ..., pubsub }) for destroy cleanup
const mesh = await getMesh(config)
await using _ = mesh
```
