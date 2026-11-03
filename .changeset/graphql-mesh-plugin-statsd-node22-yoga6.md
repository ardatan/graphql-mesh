---
"@graphql-mesh/plugin-statsd": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

StatsD clients hold sockets/timers. Cleanup must be part of Mesh/Gateway shutdown via disposables, not an ad-hoc destroy listener.

## What changed in this package

- Plugin exposes `[DisposableSymbols.asyncDispose]` for the StatsD client; `getMesh` registers with `disposables.use(plugin)`

#### Example
```ts
import useMeshStatsd from '@graphql-mesh/plugin-statsd'

const plugin = useMeshStatsd({ ...meshPluginOptions, client: statsdClient })
// getMesh: disposables.use(plugin) closes the client on shutdown
```
