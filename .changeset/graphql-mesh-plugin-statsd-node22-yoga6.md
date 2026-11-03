---
"@graphql-mesh/plugin-statsd": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Cleanup via `[DisposableSymbols.asyncDispose]` for the StatsD client; Mesh registers the plugin with `disposables.use`

#### Example
```ts
import { useMeshStatsd } from '@graphql-mesh/plugin-statsd'

const plugin = useMeshStatsd({ ...meshPluginOptions, client: statsdClient })
// getMesh: disposables.use(plugin) closes the client on shutdown
```
