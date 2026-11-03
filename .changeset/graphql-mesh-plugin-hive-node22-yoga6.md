---
"@graphql-mesh/plugin-hive": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Hive reporting already disposes through `@graphql-hive/yoga` (`onDispose` / `autoDispose`). An extra Mesh `[DisposableSymbols]` wrapper and an unused Mesh `pubsub` option suggested Mesh owned Hive lifecycle when it does not.

## What changed in this package

- Rely on `useHive` Yoga `onDispose` / Hive `autoDispose` — no extra Mesh dispose wrapper
- Drop unused plugin `pubsub` option
- Hive agent logger comes from `agent.logger` when set

#### Example
```ts
import { useMeshHive } from '@graphql-mesh/plugin-hive'

// Before: useMeshHive({ ...opts, pubsub }) + Mesh DisposableSymbols wrapper
useMeshHive({
  ...meshPluginOptions,
  token: process.env.HIVE_TOKEN!,
})
```
