---
"@graphql-mesh/plugin-statsd": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

StatsD clients own UDP sockets / timers. Without a disposable hook, Mesh shutdown left them open unless something subscribed to destroy-pubsub. Implementing `[DisposableSymbols.asyncDispose]` makes `getMesh`’s stack the single shutdown path.

## What changed

- Plugin implements `[DisposableSymbols.asyncDispose]` for the StatsD client
- `getMesh` registers the plugin with `disposables.use(plugin)`

## How to migrate

No options change — ensure you shut Mesh/Gateway down via dispose/destroy so the client closes.

#### Example
```ts
import useMeshStatsd from '@graphql-mesh/plugin-statsd'

const plugin = useMeshStatsd({ ...meshPluginOptions, client: statsdClient })
// getMesh → disposables.use(plugin)
```
