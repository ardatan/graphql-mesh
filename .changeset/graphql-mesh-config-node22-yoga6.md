---
"@graphql-mesh/config": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

On previous majors, `resolveCache` constructed every cache with `pubsub` (and an unused `store` child) so Redis/LRU could subscribe to Mesh `destroy`. After caches moved to `[DisposableSymbols]` and dropped those constructor fields, keeping the injection would only generate dead options. `resolveCustomFetch` similarly accepted an unused `cache` argument.

## What changed

- `resolveCache` no longer passes `pubsub` or `store` into cache constructors (only `importFn` for file cache and `log` for redis/cfw-kv)
- `resolveCustomFetch` no longer takes an unused `cache` argument
- Logger/pubsub resolved from `@graphql-hive/logger` / `@graphql-hive/pubsub` (`log` naming)
- Processed config still exposes an `AsyncDisposableStack` for `getMesh` to own; it is not passed into handler/transform/plugin constructors

## How to migrate

1. Regenerate Mesh artifacts / re-run config processing after upgrade.
2. Remove any hand-written `pubsub` / `store` fields you passed into cache constructors in custom config code.

#### Example
```ts
import { findAndParseConfig } from '@graphql-mesh/config'
import { getMesh } from '@graphql-mesh/runtime'

const config = await findAndParseConfig()
// Before: MeshCache({ ..., pubsub, store: rootStore.child('cache'), logger })
// After:  MeshCache({ ..., importFn, log })
const mesh = await getMesh(config)
await using _ = mesh
```
