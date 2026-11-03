---
"@graphql-mesh/config": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

`resolveCache` passed `pubsub` (for destroy subscribers), `store`, `importFn`, and `logger` into every cache constructor. After caches dropped destroy-pubsub and never read `store`, those fields were dead. `resolveCustomFetch` also took an unused `cache` argument.

## What changed ()

- `resolveCache` no longer passes `pubsub` or `store` (keeps `importFn` for file cache and `log` for redis/cfw-kv)
- `resolveCustomFetch` no longer takes an unused `cache` argument
- Logger/pubsub resolved from Hive packages; option naming uses `log`
- Processed config may expose an `AsyncDisposableStack` for `getMesh` to own. Handler/transform/plugin constructors are still not given a `disposables` option (unchanged)

## How to migrate

1. Regenerate Mesh artifacts / re-run config processing.
2. Remove hand-written cache ctor fields `pubsub` / `store` / `logger` (use `log` where needed).

#### Example
```ts
import { findAndParseConfig } from '@graphql-mesh/config'
import { getMesh } from '@graphql-mesh/runtime'

const config = await findAndParseConfig()
// before: MeshCache({ ..., pubsub, store, logger })
// now: MeshCache({ ..., importFn, log })
const mesh = await getMesh(config)
await using _ = mesh
```
