---
"@graphql-mesh/plugin-hive": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

Hive Yoga already disposes via `onDispose` / `autoDispose`. An extra Mesh dispose wrapper and an unused Mesh `pubsub` option on the plugin were misleading for Gateway setups.

## What changed ()

- No extra Mesh `[DisposableSymbols]` wrapper around Hive; rely on Hive Yoga dispose
- Unused plugin `pubsub` option removed
- Agent logger comes from `agent.logger` when set

## How to migrate

Remove `pubsub` from `useMeshHive({ ... })`. Configure Hive `autoDispose` / Yoga dispose as documented by Hive.

#### Example
```ts
import { useMeshHive } from '@graphql-mesh/plugin-hive'

// before: Mesh plugin options often passed unused pubsub
useMeshHive({
 ...meshPluginOptions,
 token: process.env.HIVE_TOKEN!,
})
```
