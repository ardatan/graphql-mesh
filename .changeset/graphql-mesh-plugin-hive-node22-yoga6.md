---
"@graphql-mesh/plugin-hive": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

`@graphql-hive/yoga` already disposes the Hive client via Yoga `onDispose` / `autoDispose`. Wrapping it again in Mesh `[DisposableSymbols]` and accepting an unused Mesh `pubsub` option implied Mesh owned Hive’s lifecycle and confused Gateway setups that never pass Mesh pubsub into the plugin.

## What changed

- No extra Mesh dispose wrapper — rely on Hive Yoga `onDispose` / `autoDispose`
- Unused plugin `pubsub` option removed
- Agent logger comes from `agent.logger` when set

## How to migrate

1. Remove `pubsub` from `useMeshHive({ ... })`.
2. Do not manually dispose the Hive plugin from Mesh disposables; configure Hive `autoDispose` / Yoga dispose as documented by Hive.

#### Example
```ts
import { useMeshHive } from '@graphql-mesh/plugin-hive'

// Before: useMeshHive({ ...opts, pubsub })
useMeshHive({
  ...meshPluginOptions,
  token: process.env.HIVE_TOKEN!,
})
```
