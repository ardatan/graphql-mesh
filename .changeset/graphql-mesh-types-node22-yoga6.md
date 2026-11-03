---
"@graphql-mesh/types": major
---

See `.changeset/node22-yoga6-shared.md` for Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, and promise-helper platform notes.

- Remove Mesh `Logger` / `DefaultLogger` / `HivePubSub` types and the Mesh pubsub module; import `Logger` from `@graphql-hive/logger` and `PubSub` from `@graphql-hive/pubsub`
- Do not pass `disposables` into handler / transform / plugin / merger options or `GetMeshSourcePayload`; disposable components implement `[DisposableSymbols]` and `getMesh` registers them with `disposables.use(...)`
- Drop `destroy` pubsub lifecycle typing
- `MeshPluginOptions.log` is optional for init-time plugin diagnostics; prefer Yoga/Gateway `context.log` at request time
- `MeshPluginOptions.pubsub` is optional (Mesh factory / Gateway `ctx`); prefer GraphQL `context.pubsub` at request time when available

#### Example
```ts
import type { Logger } from '@graphql-hive/logger'
import type { PubSub } from '@graphql-hive/pubsub'
import type { MeshPluginOptions } from '@graphql-mesh/types'

// Before: Mesh Logger / HivePubSub types + required plugin log/pubsub + injected disposables
// After:
function useMyPlugin(options: MeshPluginOptions<{ /* yaml */ }>) {
  // optional init-time only
  options.log?.debug('plugin booting')
  // request-time: use context.log / context.pubsub from Yoga/Gateway
}
```
