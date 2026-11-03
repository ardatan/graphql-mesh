---
"@graphql-mesh/plugin-hive": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Align with `@graphql-hive/yoga` / Yoga 6; rely on `useHive`'s Yoga `onDispose` / Hive `autoDispose` for client cleanup (no extra Mesh `[DisposableSymbols]` wrapper)
- Drop unused plugin `pubsub` option (Hive does not need Mesh/Gateway pubsub)
- Hive agent logger comes from `agent.logger` when set

#### Example
```ts
import { useMeshHive } from '@graphql-mesh/plugin-hive'

// Before: useMeshHive({ ...opts, pubsub, /* Mesh dispose wrapper */ })
useMeshHive({
  ...meshPluginOptions,
  token: process.env.HIVE_TOKEN,
  // cleanup via Yoga onDispose / Hive autoDispose
})
```
