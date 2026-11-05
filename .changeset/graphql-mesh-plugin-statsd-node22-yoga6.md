---
"@graphql-mesh/plugin-statsd": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

StatsD cleanup depended on destroy-pubsub style lifecycle elsewhere. The plugin now implements `[DisposableSymbols.asyncDispose]` so `getMesh` can `disposables.use(plugin)`.

## What changed ()

- Plugin implements `[DisposableSymbols.asyncDispose]` for the StatsD client
- `getMesh` registers the plugin with `disposables.use(plugin)`

## How to migrate

No options change. Shut Mesh/Gateway down via dispose/destroy so the client closes.

#### Example
```ts
import useMeshStatsd from '@graphql-mesh/plugin-statsd'

const plugin = useMeshStatsd({ ...meshPluginOptions, client: statsdClient })
```
