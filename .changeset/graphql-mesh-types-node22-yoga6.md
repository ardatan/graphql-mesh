---
"@graphql-mesh/types": minor
---

See `.changeset/node22-yoga6-shared.md` for the shared platform major (Node `>=22.18.0`, GraphQL `^16 || ^17`, Hive logger/pubsub, destroy-pubsub replaced by disposables, promise helpers).

## Motivation

these types still modeled Mesh `Logger` / `HivePubSub`, required plugin `logger`/`pubsub`, and a `destroy` pubsub channel. They did not put `disposables` on handler/transform/plugin option bags. This major updates the types to Hive packages, optional plugin `log`/`pubsub`, and drops destroy-pubsub typing so they match runtime.

## What changed ()

- Remove Mesh `Logger` / `DefaultLogger` / `HivePubSub` types and the Mesh pubsub module; use `@graphql-hive/logger` and `@graphql-hive/pubsub`
- Rename remaining option field from `logger` to `log`
- Drop `destroy` pubsub lifecycle typing
- `MeshPluginOptions.log` is optional (init-time diagnostics); prefer `context.log` at request time
- `MeshPluginOptions.pubsub` is optional; prefer `context.pubsub` at request time when available
- No `disposables` field was added to or removed from handler/transform/plugin/cache option types (it was not either)

## How to migrate

1. Point Logger/PubSub imports at Hive packages.
2. Rename `logger` option fields to `log`.
3. Treat plugin `log`/`pubsub` as optional; read request-scoped values from context inside hooks.
4. Replace destroy-pubsub listeners with `[DisposableSymbols]` on your resources.

#### Example
```ts
import type { Logger } from '@graphql-hive/logger'
import type { PubSub } from '@graphql-hive/pubsub'
import type { MeshPluginOptions } from '@graphql-mesh/types'

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
