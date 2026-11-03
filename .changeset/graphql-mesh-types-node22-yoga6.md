---
"@graphql-mesh/types": major
---

Platform baseline (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, promise helpers) is covered in `.changeset/node22-yoga6-shared.md`.

## Why

Mesh types were still modeling a Mesh-owned logger/pubsub and a `destroy` pubsub lifecycle, plus optional `disposables` injected into every handler/plugin. That fought Yoga 6 / Hive Gateway, where request logging and pubsub live on GraphQL context and cleanup is Explicit Resource Management.

## What changed in this package

- Remove Mesh `Logger` / `DefaultLogger` / `HivePubSub` types and the Mesh pubsub module — import `Logger` from `@graphql-hive/logger` and `PubSub` from `@graphql-hive/pubsub`
- Do not pass `disposables` into handler / transform / plugin / merger options or `GetMeshSourcePayload`; disposable components implement `[DisposableSymbols]` and `getMesh` registers them
- Drop `destroy` pubsub lifecycle typing
- `MeshPluginOptions.log` is optional (init-time diagnostics only); prefer Yoga/Gateway `context.log` at request time
- `MeshPluginOptions.pubsub` is optional; prefer GraphQL `context.pubsub` at request time when available

#### Example
```ts
import type { Logger } from '@graphql-hive/logger'
import type { PubSub } from '@graphql-hive/pubsub'
import type { MeshPluginOptions } from '@graphql-mesh/types'

// Before: Mesh Logger/HivePubSub + required plugin log/pubsub + options.disposables
function useMyPlugin(options: MeshPluginOptions<{ flag?: boolean }>) {
  options.log?.debug('plugin booting') // init-time only
  return {
    onExecute({ args }) {
      const log = (args.contextValue as { log?: Logger }).log
      const pubsub = (args.contextValue as { pubsub?: PubSub }).pubsub ?? options.pubsub
      log?.debug('execute')
      pubsub?.publish('my-plugin:tick', {})
    },
  }
}
```
