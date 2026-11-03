---
"@graphql-mesh/types": major
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, disposables, builtins, promise helpers) and the common import/migration map.

## Motivation

`@graphql-mesh/types` still described a Mesh-owned world: Mesh `Logger` / `HivePubSub`, a required plugin `log`/`pubsub` pair, an injectable `disposables` bag on every factory, and a `destroy` pubsub channel for teardown. Yoga 6 and Hive Gateway already put logger/pubsub on GraphQL context and tear down with Explicit Resource Management. Leaving those types in place forced every handler/plugin to keep the old contract even when runtime no longer honored it.

## What changed

- Remove Mesh `Logger` / `DefaultLogger` / `HivePubSub` types and the Mesh pubsub module — use `@graphql-hive/logger` and `@graphql-hive/pubsub`
- Remove `disposables` from handler / transform / plugin / merger options and `GetMeshSourcePayload`; components implement `[DisposableSymbols]` and callers `disposables.use(...)`
- Remove `destroy` pubsub lifecycle typing
- `MeshPluginOptions.log` is **optional** (init-time diagnostics only); prefer `context.log` on the request path
- `MeshPluginOptions.pubsub` is **optional**; prefer `context.pubsub` on the request path when Gateway/Yoga provides it

## How to migrate

1. Update imports of `Logger` / `PubSub` to Hive packages.
2. Delete any `disposables` fields you passed into handlers/plugins.
3. Treat plugin `log`/`pubsub` as optional; read request-scoped values from context inside hooks.
4. Replace `destroy` pubsub listeners with `[DisposableSymbols]` on your resources.

#### Example
```ts
import type { Logger } from '@graphql-hive/logger'
import type { PubSub } from '@graphql-hive/pubsub'
import type { MeshPluginOptions } from '@graphql-mesh/types'

// Before: required log/pubsub + options.disposables + Mesh Logger types
function useMyPlugin(options: MeshPluginOptions<{ flag?: boolean }>) {
  options.log?.debug('boot') // init-time only
  return {
    onExecute({ args }) {
      const ctx = args.contextValue as { log?: Logger; pubsub?: PubSub }
      ctx.log?.debug('execute')
      ;(ctx.pubsub ?? options.pubsub)?.publish('my-plugin:tick', {})
    },
  }
}
```
